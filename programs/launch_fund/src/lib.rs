use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo");

#[program]
pub mod launch_fund {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        name: String,
        description: String,
        target_amount: u64,
        token_symbol: String,
        token_name: String,
        total_supply: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;

        campaign.creator = ctx.accounts.creator.key();
        campaign.name = name;
        campaign.description = description;
        campaign.target_amount = target_amount;
        campaign.raised_amount = 0;
        campaign.token_symbol = token_symbol;
        campaign.token_name = token_name;
        campaign.total_supply = total_supply;
        campaign.token_mint = ctx.accounts.token_mint.key();
        campaign.created_at = clock.unix_timestamp;
        campaign.is_active = true;
        campaign.bump = ctx.bumps.campaign;

        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        require!(ctx.accounts.campaign.is_active, ErrorCode::CampaignNotActive);
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Calculate tokens to mint based on bonding curve
        let tokens_to_mint = calculate_tokens_from_sol(amount, ctx.accounts.campaign.raised_amount)?;

        // Get campaign data for seeds
        let campaign_creator = ctx.accounts.campaign.creator;
        let campaign_name = ctx.accounts.campaign.name.clone();
        let campaign_bump = ctx.accounts.campaign.bump;
        let campaign_key = ctx.accounts.campaign.key();
        let contributor_key = ctx.accounts.contributor.key();

        // Transfer SOL from contributor to campaign
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.contributor.to_account_info(),
                to: ctx.accounts.campaign.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Mint tokens to contributor
        let seeds = &[
            b"campaign",
            campaign_creator.as_ref(),
            campaign_name.as_bytes(),
            &[campaign_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.contributor_token_account.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_to_mint)?;

        // Update campaign raised amount
        ctx.accounts.campaign.raised_amount += amount;

        emit!(ContributionEvent {
            campaign: campaign_key,
            contributor: contributor_key,
            sol_amount: amount,
            token_amount: tokens_to_mint,
            new_total: ctx.accounts.campaign.raised_amount,
        });

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        
        require!(campaign.creator == ctx.accounts.creator.key(), ErrorCode::Unauthorized);
        require!(amount <= campaign.raised_amount, ErrorCode::InsufficientFunds);

        let campaign_lamports = campaign.to_account_info().lamports();
        require!(amount <= campaign_lamports, ErrorCode::InsufficientFunds);

        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += amount;

        campaign.raised_amount -= amount;

        emit!(WithdrawalEvent {
            campaign: campaign.key(),
            creator: ctx.accounts.creator.key(),
            amount,
            remaining: campaign.raised_amount,
        });

        Ok(())
    }

    pub fn get_token_price(ctx: Context<GetTokenPrice>) -> Result<u64> {
        let campaign = &ctx.accounts.campaign;
        let price = calculate_token_price(campaign.raised_amount)?;
        
        emit!(TokenPriceEvent {
            campaign: campaign.key(),
            price,
            raised_amount: campaign.raised_amount,
        });

        Ok(price)
    }
}

// Calculate tokens based on bonding curve: tokens = sqrt(sol_amount * 1000000)
fn calculate_tokens_from_sol(sol_amount: u64, current_raised: u64) -> Result<u64> {
    let base_tokens = (sol_amount * 1_000_000_000) / 1_000_000; // 1M tokens per SOL base rate
    let bonus_rate = if current_raised < 10_000_000_000 { 120 } else { 100 }; // 20% bonus early
    let tokens = (base_tokens * bonus_rate) / 100;
    Ok(tokens)
}

// Calculate current token price in lamports
fn calculate_token_price(raised_amount: u64) -> Result<u64> {
    let base_price = 1000; // 0.000001 SOL base price
    let price_multiplier = 1 + (raised_amount / 1_000_000_000); // Price increases with funding
    Ok(base_price * price_multiplier)
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = campaign,
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.name.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = contributor,
        associated_token::mint = token_mint,
        associated_token::authority = contributor
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub contributor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.name.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetTokenPrice<'info> {
    #[account(
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.name.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(200)]
    pub description: String,
    pub target_amount: u64,
    pub raised_amount: u64,
    #[max_len(10)]
    pub token_symbol: String,
    #[max_len(50)]
    pub token_name: String,
    pub total_supply: u64,
    pub token_mint: Pubkey,
    pub created_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[event]
pub struct ContributionEvent {
    pub campaign: Pubkey,
    pub contributor: Pubkey,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub new_total: u64,
}

#[event]
pub struct WithdrawalEvent {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub remaining: u64,
}

#[event]
pub struct TokenPriceEvent {
    pub campaign: Pubkey,
    pub price: u64,
    pub raised_amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Campaign is not active")]
    CampaignNotActive,
    #[msg("Invalid contribution amount")]
    InvalidAmount,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}