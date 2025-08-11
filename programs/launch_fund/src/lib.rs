use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use solana_program::instruction::Instruction;
use solana_program::program::{invoke, invoke_signed};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL
const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000; // 1.073B tokens
const TOKEN_DECIMALS: u8 = 6;
const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1B tokens
const FEE_BASIS_POINTS: u64 = 100; // 1% fee
const CREATOR_ALLOCATION_PCT: u64 = 10; // 10% of tokens for creator
const MIN_FUNDING_RATIO: u64 = 10; // Minimum 10% to funding
const MAX_FUNDING_RATIO: u64 = 90; // Maximum 90% to funding
const POST_GOAL_FUNDING_RATIO: u64 = 0; // 0% to funding after goal reached

// USDC mint address on mainnet
const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// Jupiter program ID
const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
// SOL/USD price feed ID from Pyth
const SOL_USD_PRICE_FEED: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
// Slippage tolerance (1% = 100 basis points)
const SLIPPAGE_BPS: u64 = 100;

#[program]
pub mod launch_fund {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        name: String,
        description: String,
        target_amount: u64,
        end_timestamp: i64,
        milestones: Vec<Milestone>,
        funding_ratio: u64, // Percentage (0-100) going to funding pool before goal
        conversion_strategy: ConversionStrategy, // When to convert SOL to USDC
    ) -> Result<()> {
        // Validate funding ratio
        require!(
            funding_ratio >= MIN_FUNDING_RATIO && funding_ratio <= MAX_FUNDING_RATIO,
            ErrorCode::InvalidFundingRatio
        );
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;
        
        // Calculate token allocations
        let tradeable_supply = TOTAL_SUPPLY * (100 - CREATOR_ALLOCATION_PCT) / 100;
        let creator_tokens = TOTAL_SUPPLY * CREATOR_ALLOCATION_PCT / 100;
        
        campaign.creator = ctx.accounts.creator.key();
        campaign.token_mint = ctx.accounts.token_mint.key();
        campaign.name = name;
        campaign.description = description;
        campaign.target_amount = target_amount;
        campaign.raised_amount = 0;
        campaign.funding_pool_amount = 0;
        campaign.funding_pool_sol_amount = 0;
        campaign.end_timestamp = end_timestamp;
        campaign.created_at = clock.unix_timestamp;
        campaign.is_active = true;
        campaign.virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES;
        campaign.virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES;
        campaign.real_sol_reserves = 0;
        campaign.real_token_reserves = tradeable_supply;
        campaign.token_total_supply = TOTAL_SUPPLY;
        campaign.tradeable_supply = tradeable_supply;
        campaign.creator_token_allocation = creator_tokens;
        campaign.complete = false;
        campaign.milestones = milestones;
        campaign.current_milestone = 0;
        campaign.funds_withdrawn = 0;
        campaign.funding_ratio = funding_ratio;
        campaign.conversion_strategy = conversion_strategy;
        campaign.bump = ctx.bumps.campaign;
        
        // Mint creator allocation to creator
        let seeds = &[
            b"campaign",
            campaign.creator.as_ref(),
            campaign.name.as_bytes(),
            &[campaign.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: campaign.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, creator_tokens)?;
        
        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.is_active, ErrorCode::CampaignInactive);
        
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < campaign.end_timestamp, ErrorCode::CampaignEnded);
        
        // Calculate tokens out using bonding curve (only on tradeable supply)
        let tokens_out = calculate_tokens_out(
            sol_amount,
            campaign.virtual_sol_reserves + campaign.real_sol_reserves,
            campaign.virtual_token_reserves + campaign.real_token_reserves,
        )?;
        
        // Apply fee (1%)
        let fee = sol_amount.checked_mul(FEE_BASIS_POINTS).unwrap() / 10000;
        let sol_after_fee = sol_amount.checked_sub(fee).unwrap();
        
        // Determine allocation based on funding goal completion and creator's choice
        let funding_goal_reached = campaign.funding_pool_amount >= campaign.target_amount;
        
        let funding_pct = if funding_goal_reached {
            POST_GOAL_FUNDING_RATIO // 0% after goal reached
        } else {
            campaign.funding_ratio // Creator's chosen ratio
        };
        
        let liquidity_pct = 100 - funding_pct;
        
        let funding_portion = sol_after_fee.checked_mul(funding_pct).unwrap() / 100;
        let liquidity_portion = sol_after_fee.checked_sub(funding_portion).unwrap();
        
        // Transfer SOL from buyer to campaign vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.campaign_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_after_fee)?;
        
        // Mint tokens to buyer
        let seeds = &[
            b"campaign",
            campaign.creator.as_ref(),
            campaign.name.as_bytes(),
            &[campaign.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: campaign.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_out)?;
        
        // Update reserves (only liquidity portion affects bonding curve)
        campaign.real_sol_reserves += liquidity_portion;
        campaign.real_token_reserves = campaign.real_token_reserves.checked_sub(tokens_out).unwrap();
        
        // Update funding tracking
        campaign.raised_amount += sol_after_fee;
        
        // Handle conversion based on strategy
        if funding_portion > 0 && !funding_goal_reached {
            match campaign.conversion_strategy {
                ConversionStrategy::Instant => {
                    // Convert all funding portion to USDC immediately
                    let usdc_amount = convert_sol_to_usdc(
                        &ctx.accounts.price_update,
                        funding_portion,
                    )?;
                    
                    // Try Jupiter swap with fallback
                    match execute_jupiter_swap(
                        funding_portion,
                        usdc_amount,
                        &ctx.accounts,
                        &campaign.key(),
                        ctx.bumps.campaign,
                    ) {
                        Ok(_) => {
                            campaign.funding_pool_amount += usdc_amount;
                            msg!("Instant conversion: {} lamports -> {} USDC", funding_portion, usdc_amount);
                        },
                        Err(_) => {
                            // Fallback: store as SOL if swap fails
                            campaign.funding_pool_sol_amount += funding_portion;
                            campaign.funding_pool_amount += funding_portion;
                            msg!("Swap failed, stored {} lamports as SOL for later conversion", funding_portion);
                        }
                    }
                },
                ConversionStrategy::OnWithdrawal => {
                    // Keep as SOL, convert later on withdrawal
                    campaign.funding_pool_sol_amount += funding_portion;
                    campaign.funding_pool_amount += funding_portion; // Track SOL amount for now
                    msg!("Deferred conversion: {} lamports stored as SOL", funding_portion);
                },
                ConversionStrategy::Hybrid => {
                    // Convert 50% to USDC, keep 50% as SOL
                    let instant_portion = funding_portion / 2;
                    let deferred_portion = funding_portion - instant_portion;
                    
                    let usdc_amount = convert_sol_to_usdc(
                        &ctx.accounts.price_update,
                        instant_portion,
                    )?;
                    
                    // Try Jupiter swap for instant portion with fallback
                    match execute_jupiter_swap(
                        instant_portion,
                        usdc_amount,
                        &ctx.accounts,
                        &campaign.key(),
                        ctx.bumps.campaign,
                    ) {
                        Ok(_) => {
                            campaign.funding_pool_amount += usdc_amount;
                            campaign.funding_pool_sol_amount += deferred_portion;
                            msg!("Hybrid conversion: {} to USDC, {} kept as SOL", usdc_amount, deferred_portion);
                        },
                        Err(_) => {
                            // Fallback: keep all as SOL if swap fails
                            campaign.funding_pool_sol_amount += funding_portion;
                            campaign.funding_pool_amount += funding_portion;
                            msg!("Swap failed, stored {} lamports as SOL for later conversion", funding_portion);
                        }
                    }
                }
            }
        }
        
        // Send fee to creator
        **ctx.accounts.creator.try_borrow_mut_lamports()? += fee;
        
        emit!(TokensPurchased {
            campaign: campaign.key(),
            buyer: ctx.accounts.buyer.key(),
            sol_amount,
            tokens_amount: tokens_out,
            funding_amount: funding_portion,
            liquidity_amount: liquidity_portion,
            new_sol_reserves: campaign.real_sol_reserves,
            new_token_reserves: campaign.real_token_reserves,
        });
        
        Ok(())
    }

    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.is_active, ErrorCode::CampaignInactive);
        
        // Calculate SOL out using bonding curve
        let sol_out = calculate_sol_out(
            token_amount,
            campaign.virtual_sol_reserves + campaign.real_sol_reserves,
            campaign.virtual_token_reserves + campaign.real_token_reserves,
        )?;
        
        // Apply fee (1%)
        let fee = sol_out.checked_mul(FEE_BASIS_POINTS).unwrap() / 10000;
        let sol_after_fee = sol_out.checked_sub(fee).unwrap();
        
        require!(
            campaign.real_sol_reserves >= sol_after_fee,
            ErrorCode::InsufficientLiquidity
        );
        
        // Burn tokens from seller
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, token_amount)?;
        
        // Transfer SOL from vault to seller
        **ctx.accounts.campaign_vault.try_borrow_mut_lamports()? -= sol_after_fee;
        **ctx.accounts.seller.try_borrow_mut_lamports()? += sol_after_fee;
        
        // Send fee to creator
        **ctx.accounts.campaign_vault.try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.creator.try_borrow_mut_lamports()? += fee;
        
        // Update reserves
        campaign.real_sol_reserves -= sol_out;
        campaign.real_token_reserves += token_amount;
        
        emit!(TokensSold {
            campaign: campaign.key(),
            seller: ctx.accounts.seller.key(),
            tokens_amount: token_amount,
            sol_amount: sol_after_fee,
            new_sol_reserves: campaign.real_sol_reserves,
            new_token_reserves: campaign.real_token_reserves,
        });
        
        Ok(())
    }

    pub fn withdraw_milestone_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;
        
        require!(
            ctx.accounts.creator.key() == campaign.creator,
            ErrorCode::Unauthorized
        );
        
        require!(
            campaign.current_milestone < campaign.milestones.len(),
            ErrorCode::AllMilestonesComplete
        );
        
        let milestone = &campaign.milestones[campaign.current_milestone];
        
        // Check if milestone requirements are met
        require!(
            campaign.funding_pool_amount >= milestone.required_amount,
            ErrorCode::MilestoneNotReached
        );
        
        require!(
            clock.unix_timestamp >= milestone.unlock_timestamp,
            ErrorCode::MilestoneTooEarly
        );
        
        // Handle conversion strategy for withdrawal
        let mut total_usdc_to_withdraw = 0u64;
        let mut total_sol_converted = 0u64;
        
        match campaign.conversion_strategy {
            ConversionStrategy::Instant => {
                // Funds already in USDC, just transfer
                let total_milestones = campaign.milestones.len() as u64;
                total_usdc_to_withdraw = campaign.funding_pool_amount / total_milestones;
            },
            ConversionStrategy::OnWithdrawal => {
                // Convert SOL to USDC now
                let total_milestones = campaign.milestones.len() as u64;
                let sol_to_convert = campaign.funding_pool_sol_amount / total_milestones;
                
                if sol_to_convert > 0 {
                    let usdc_amount = convert_sol_to_usdc(
                        &ctx.accounts.price_update,
                        sol_to_convert,
                    )?;
                    
                    // Try to execute swap
                    match execute_jupiter_swap(
                        sol_to_convert,
                        usdc_amount,
                        &ctx.accounts,
                        &campaign.key(),
                        ctx.bumps.campaign,
                    ) {
                        Ok(_) => {
                            total_usdc_to_withdraw = usdc_amount;
                            total_sol_converted = sol_to_convert;
                            msg!("Converted {} SOL to {} USDC on withdrawal", sol_to_convert, usdc_amount);
                        },
                        Err(_) => {
                            // Fallback: transfer SOL equivalent value
                            **ctx.accounts.campaign_vault.try_borrow_mut_lamports()? -= sol_to_convert;
                            **ctx.accounts.creator.try_borrow_mut_lamports()? += sol_to_convert;
                            campaign.current_milestone += 1;
                            campaign.funds_withdrawn += sol_to_convert;
                            campaign.funding_pool_sol_amount -= sol_to_convert;
                            msg!("Swap failed, withdrew {} SOL directly", sol_to_convert);
                            return Ok(());
                        }
                    }
                }
            },
            ConversionStrategy::Hybrid => {
                // Mix of USDC and SOL conversion
                let total_milestones = campaign.milestones.len() as u64;
                let usdc_portion = campaign.funding_pool_amount / total_milestones;
                let sol_portion = campaign.funding_pool_sol_amount / total_milestones;
                
                total_usdc_to_withdraw += usdc_portion;
                
                if sol_portion > 0 {
                    let usdc_from_sol = convert_sol_to_usdc(
                        &ctx.accounts.price_update,
                        sol_portion,
                    )?;
                    
                    match execute_jupiter_swap(
                        sol_portion,
                        usdc_from_sol,
                        &ctx.accounts,
                        &campaign.key(),
                        ctx.bumps.campaign,
                    ) {
                        Ok(_) => {
                            total_usdc_to_withdraw += usdc_from_sol;
                            total_sol_converted = sol_portion;
                        },
                        Err(_) => {
                            // Fallback for SOL portion only
                            **ctx.accounts.campaign_vault.try_borrow_mut_lamports()? -= sol_portion;
                            **ctx.accounts.creator.try_borrow_mut_lamports()? += sol_portion;
                            total_sol_converted = sol_portion;
                        }
                    }
                }
            }
        }
        
        // Transfer USDC to creator if any
        if total_usdc_to_withdraw > 0 {
            let campaign_seeds = &[
                b"campaign",
                campaign.creator.as_ref(),
                campaign.name.as_bytes(),
                &[ctx.bumps.campaign],
            ];
            let signer_seeds = &[&campaign_seeds[..]];
            
            let cpi_accounts = Transfer {
                from: ctx.accounts.campaign_usdc_account.to_account_info(),
                to: ctx.accounts.creator_usdc_account.to_account_info(),
                authority: campaign.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            
            token::transfer(cpi_ctx, total_usdc_to_withdraw)?;
            msg!("Transferred {} USDC to creator", total_usdc_to_withdraw);
        }
        
        // Update campaign state
        campaign.current_milestone += 1;
        campaign.funds_withdrawn += total_usdc_to_withdraw;
        campaign.funding_pool_amount -= total_usdc_to_withdraw;
        campaign.funding_pool_sol_amount -= total_sol_converted;
        
        emit!(MilestoneFundsWithdrawn {
            campaign: campaign.key(),
            milestone_index: campaign.current_milestone - 1,
            amount_withdrawn: total_usdc_to_withdraw,
            remaining_funds: campaign.funding_pool_amount,
        });
        
        Ok(())
    }
    
    pub fn emergency_withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;
        
        require!(
            ctx.accounts.creator.key() == campaign.creator,
            ErrorCode::Unauthorized
        );
        
        // Only allow emergency withdrawal if campaign failed or ended
        require!(
            clock.unix_timestamp > campaign.end_timestamp || 
            campaign.funding_pool_amount < campaign.target_amount,
            ErrorCode::CampaignStillActive
        );
        
        let available = campaign.funding_pool_amount;
        require!(amount <= available, ErrorCode::InsufficientFunds);
        
        // Transfer funds from vault to creator
        **ctx.accounts.campaign_vault.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.creator.try_borrow_mut_lamports()? += amount;
        
        campaign.funds_withdrawn += amount;
        campaign.funding_pool_amount -= amount;
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, description: String, target_amount: u64, end_timestamp: i64, milestones: Vec<Milestone>, funding_ratio: u64, conversion_strategy: ConversionStrategy)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = Campaign::LEN,
        seeds = [b"campaign", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = campaign,
        seeds = [b"token_mint", campaign.key().as_ref()],
        bump
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = token_mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        seeds = [b"campaign_vault", campaign.key().as_ref()],
        bump,
        space = 8
    )]
    pub campaign_vault: SystemAccount<'info>,
    
    /// CHECK: USDC mint account - validated by address
    #[account(address = USDC_MINT.parse::<Pubkey>().unwrap())]
    pub usdc_mint: AccountInfo<'info>,
    
    #[account(
        init,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = campaign,
    )]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub campaign_vault: SystemAccount<'info>,
    
    /// CHECK: Creator account for fee distribution
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    /// CHECK: Pyth price update account for SOL/USD conversion
    pub price_update: AccountInfo<'info>,
    
    /// CHECK: USDC mint account - validated by address
    #[account(address = USDC_MINT.parse::<Pubkey>().unwrap())]
    pub usdc_mint: AccountInfo<'info>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = campaign,
    )]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    
    /// CHECK: Jupiter program for swaps
    #[account(address = JUPITER_PROGRAM_ID.parse::<Pubkey>().unwrap())]
    pub jupiter_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub campaign_vault: SystemAccount<'info>,
    
    /// CHECK: Creator account for fee distribution
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub campaign_vault: SystemAccount<'info>,
    
    /// CHECK: Pyth price update account for SOL/USD conversion
    pub price_update: AccountInfo<'info>,
    
    /// CHECK: USDC mint account - validated by address
    #[account(address = USDC_MINT.parse::<Pubkey>().unwrap())]
    pub usdc_mint: AccountInfo<'info>,
    
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = campaign,
    )]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = creator,
    )]
    pub creator_usdc_account: Account<'info, TokenAccount>,
    
    /// CHECK: Jupiter program for swaps
    #[account(address = JUPITER_PROGRAM_ID.parse::<Pubkey>().unwrap())]
    pub jupiter_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub token_mint: Pubkey,
    pub name: String,
    pub description: String,
    pub target_amount: u64,
    pub raised_amount: u64,
    pub funding_pool_amount: u64, // USDC value
    pub funding_pool_sol_amount: u64, // Original SOL amount
    pub end_timestamp: i64,
    pub created_at: i64,
    pub is_active: bool,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub token_total_supply: u64,
    pub tradeable_supply: u64,
    pub creator_token_allocation: u64,
    pub milestones: Vec<Milestone>,
    pub current_milestone: usize,
    pub funds_withdrawn: u64,
    pub funding_ratio: u64, // Creator's chosen funding percentage (10-90%)
    pub conversion_strategy: ConversionStrategy, // When to convert SOL to USDC
    pub complete: bool,
    pub bump: u8,
}

impl Campaign {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // token_mint
        4 + 64 + // name (max 64 chars)
        4 + 256 + // description (max 256 chars)
        8 + // target_amount
        8 + // raised_amount
        8 + // funding_pool_amount
        8 + // funding_pool_sol_amount
        8 + // end_timestamp
        8 + // created_at
        1 + // is_active
        8 + // virtual_sol_reserves
        8 + // virtual_token_reserves
        8 + // real_sol_reserves
        8 + // real_token_reserves
        8 + // token_total_supply
        8 + // tradeable_supply
        8 + // creator_token_allocation
        4 + (5 * 32) + // milestones (max 5 milestones)
        8 + // current_milestone
        8 + // funds_withdrawn
        8 + // funding_ratio
        1 + // conversion_strategy
        1 + // complete
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Milestone {
    pub name: String,
    pub description: String,
    pub required_amount: u64,
    pub unlock_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ConversionStrategy {
    Instant,        // Convert SOL to USDC immediately on purchase
    OnWithdrawal,   // Keep SOL, convert to USDC only when withdrawing
    Hybrid,         // Convert 50% instantly, keep 50% as SOL
}

// Bonding curve calculations
fn calculate_tokens_out(
    sol_in: u64,
    sol_reserves: u64,
    token_reserves: u64,
) -> Result<u64> {
    // Using constant product formula: x * y = k
    // tokens_out = token_reserves - (k / (sol_reserves + sol_in))
    let k = sol_reserves as u128 * token_reserves as u128;
    let new_sol_reserves = sol_reserves as u128 + sol_in as u128;
    let new_token_reserves = k / new_sol_reserves;
    let tokens_out = token_reserves as u128 - new_token_reserves;
    
    Ok(tokens_out as u64)
}

fn calculate_sol_out(
    tokens_in: u64,
    sol_reserves: u64,
    token_reserves: u64,
) -> Result<u64> {
    // Using constant product formula: x * y = k
    // sol_out = sol_reserves - (k / (token_reserves + tokens_in))
    let k = sol_reserves as u128 * token_reserves as u128;
    let new_token_reserves = token_reserves as u128 + tokens_in as u128;
    let new_sol_reserves = k / new_token_reserves;
    let sol_out = sol_reserves as u128 - new_sol_reserves;
    
    Ok(sol_out as u64)
}

// Convert SOL to USDC using Pyth price feed
fn convert_sol_to_usdc(
    price_update: &AccountInfo,
    sol_amount: u64,
) -> Result<u64> {
    let price_update_data = price_update.try_borrow_data()?;
    let price_update = PriceUpdateV2::try_deserialize(&mut &price_update_data[8..])?;
    
    let sol_usd_feed_id = get_feed_id_from_hex(SOL_USD_PRICE_FEED)?;
    let sol_price = price_update.get_price_no_older_than(
        &Clock::get()?,
        60, // Max 60 seconds old
        &sol_usd_feed_id,
    )?;
    
    // Convert lamports to SOL, multiply by price, convert to USDC (6 decimals)
    let sol_amount_scaled = (sol_amount as u128) * (sol_price.price as u128);
    let usdc_amount = sol_amount_scaled / (10u128.pow(9)); // SOL has 9 decimals, USDC has 6
    
    Ok(usdc_amount as u64)
}

// Execute actual SOL to USDC swap via Jupiter
fn execute_jupiter_swap(
    sol_amount: u64,
    min_usdc_amount: u64,
    accounts: &BuyTokens,
    campaign_key: &Pubkey,
    campaign_bump: u8,
) -> Result<()> {
    // Calculate minimum output with slippage protection
    let min_out = min_usdc_amount * (10000 - SLIPPAGE_BPS) / 10000;
    
    // Campaign seeds for signing
    let campaign_seeds = &[
        b"campaign",
        accounts.campaign.creator.as_ref(),
        accounts.campaign.name.as_bytes(),
        &[campaign_bump],
    ];
    let signer_seeds = &[&campaign_seeds[..]];
    
    // Create Jupiter swap instruction
    let jupiter_swap_data = create_jupiter_swap_data(
        sol_amount,
        min_out,
        &accounts.campaign_vault.key(),
        &accounts.campaign_usdc_account.key(),
    )?;
    
    let jupiter_accounts = vec![
        AccountMeta::new(accounts.campaign_vault.key(), true), // payer/signer
        AccountMeta::new_readonly(accounts.usdc_mint.key(), false), // USDC mint
        AccountMeta::new(accounts.campaign_usdc_account.key(), false), // destination USDC account
        AccountMeta::new_readonly(accounts.system_program.key(), false),
        AccountMeta::new_readonly(accounts.token_program.key(), false),
        // Additional Jupiter-specific accounts would be added here
    ];
    
    let jupiter_instruction = Instruction {
        program_id: JUPITER_PROGRAM_ID.parse::<Pubkey>().unwrap(),
        accounts: jupiter_accounts,
        data: jupiter_swap_data,
    };
    
    // Execute the swap with campaign as signer
    invoke_signed(
        &jupiter_instruction,
        &[
            accounts.campaign_vault.to_account_info(),
            accounts.usdc_mint.to_account_info(),
            accounts.campaign_usdc_account.to_account_info(),
            accounts.system_program.to_account_info(),
            accounts.token_program.to_account_info(),
            accounts.jupiter_program.to_account_info(),
        ],
        signer_seeds,
    )?;
    
    msg!("Jupiter swap executed: {} SOL -> {} USDC (min: {})", sol_amount, min_usdc_amount, min_out);
    Ok(())
}

// Create Jupiter swap instruction data
fn create_jupiter_swap_data(
    amount_in: u64,
    minimum_amount_out: u64,
    source: &Pubkey,
    destination: &Pubkey,
) -> Result<Vec<u8>> {
    // This is a simplified version - real Jupiter integration would use their SDK
    // to build the proper instruction data with routing information
    let mut data = Vec::new();
    
    // Jupiter swap discriminator (8 bytes)
    data.extend_from_slice(&[0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    
    // Amount in (8 bytes)
    data.extend_from_slice(&amount_in.to_le_bytes());
    
    // Minimum amount out (8 bytes) 
    data.extend_from_slice(&minimum_amount_out.to_le_bytes());
    
    // Source account (32 bytes)
    data.extend_from_slice(source.as_ref());
    
    // Destination account (32 bytes)
    data.extend_from_slice(destination.as_ref());
    
    Ok(data)
}

#[event]
pub struct TokensPurchased {
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub sol_amount: u64,
    pub tokens_amount: u64,
    pub funding_amount: u64,
    pub liquidity_amount: u64,
    pub new_sol_reserves: u64,
    pub new_token_reserves: u64,
}

#[event]
pub struct TokensSold {
    pub campaign: Pubkey,
    pub seller: Pubkey,
    pub tokens_amount: u64,
    pub sol_amount: u64,
    pub new_sol_reserves: u64,
    pub new_token_reserves: u64,
}

#[event]
pub struct MilestoneFundsWithdrawn {
    pub campaign: Pubkey,
    pub milestone_index: usize,
    pub amount_withdrawn: u64,
    pub remaining_funds: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Campaign is not active")]
    CampaignInactive,
    #[msg("Campaign has ended")]
    CampaignEnded,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("All milestones have been completed")]
    AllMilestonesComplete,
    #[msg("Milestone funding requirement not reached")]
    MilestoneNotReached,
    #[msg("Milestone unlock time not reached")]
    MilestoneTooEarly,
    #[msg("Campaign is still active")]
    CampaignStillActive,
    #[msg("Invalid funding ratio - must be between 10% and 90%")]
    InvalidFundingRatio,
    #[msg("Jupiter swap failed")]
    SwapFailed,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient USDC balance after swap")]
    InsufficientSwapOutput,
}