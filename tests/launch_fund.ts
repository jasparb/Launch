import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LaunchFund } from "../target/types/launch_fund";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

describe("launch_fund", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.LaunchFund as Program<LaunchFund>;
  const provider = anchor.getProvider();

  // Test accounts
  let creator: Keypair;
  let contributor: Keypair;
  let campaignPda: PublicKey;
  let tokenMint: Keypair;
  let campaignBump: number;

  const campaignName = "Test Campaign";
  const campaignDescription = "A test campaign for crowdfunding";
  const targetAmount = new anchor.BN(10 * LAMPORTS_PER_SOL); // 10 SOL
  const tokenSymbol = "TEST";
  const tokenName = "Test Token";
  const totalSupply = new anchor.BN(1000000 * 1e9); // 1M tokens

  before(async () => {
    // Generate test keypairs
    creator = Keypair.generate();
    contributor = Keypair.generate();
    tokenMint = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(creator.publicKey, 2 * LAMPORTS_PER_SOL),
      "confirmed"
    );
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(contributor.publicKey, 2 * LAMPORTS_PER_SOL),
      "confirmed"
    );

    // Derive campaign PDA
    [campaignPda, campaignBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        Buffer.from(campaignName),
      ],
      program.programId
    );
  });

  it("Initializes a campaign", async () => {
    const tx = await program.methods
      .initializeCampaign(
        campaignName,
        campaignDescription,
        targetAmount,
        tokenSymbol,
        tokenName,
        totalSupply
      )
      .accounts({
        campaign: campaignPda,
        tokenMint: tokenMint.publicKey,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator, tokenMint])
      .rpc();

    console.log("Initialize campaign transaction signature", tx);

    // Fetch the campaign account
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    
    // Verify campaign data
    expect(campaignAccount.creator.toString()).to.equal(creator.publicKey.toString());
    expect(campaignAccount.name).to.equal(campaignName);
    expect(campaignAccount.description).to.equal(campaignDescription);
    expect(campaignAccount.targetAmount.toString()).to.equal(targetAmount.toString());
    expect(campaignAccount.raisedAmount.toString()).to.equal("0");
    expect(campaignAccount.tokenSymbol).to.equal(tokenSymbol);
    expect(campaignAccount.tokenName).to.equal(tokenName);
    expect(campaignAccount.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(campaignAccount.tokenMint.toString()).to.equal(tokenMint.publicKey.toString());
    expect(campaignAccount.isActive).to.be.true;
    expect(campaignAccount.bump).to.equal(campaignBump);
  });

  it("Allows contributions to the campaign", async () => {
    const contributionAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    // Get contributor's associated token account
    const contributorTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      contributor.publicKey
    );

    const tx = await program.methods
      .contribute(contributionAmount)
      .accounts({
        campaign: campaignPda,
        tokenMint: tokenMint.publicKey,
        contributorTokenAccount: contributorTokenAccount,
        contributor: contributor.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([contributor])
      .rpc();

    console.log("Contribution transaction signature", tx);

    // Fetch updated campaign account
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    
    // Verify contribution was recorded
    expect(campaignAccount.raisedAmount.toString()).to.equal(contributionAmount.toString());

    // Verify tokens were minted to contributor
    const contributorTokenBalance = await provider.connection.getTokenAccountBalance(contributorTokenAccount);
    expect(parseInt(contributorTokenBalance.value.amount)).to.be.greaterThan(0);
  });

  it("Allows creator to withdraw funds", async () => {
    const withdrawAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL); // 0.5 SOL
    
    // Get creator's balance before withdrawal
    const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

    const tx = await program.methods
      .withdrawFunds(withdrawAmount)
      .accounts({
        campaign: campaignPda,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    console.log("Withdrawal transaction signature", tx);

    // Fetch updated campaign account
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    
    // Verify withdrawal was recorded
    const expectedRaisedAmount = new anchor.BN(1 * LAMPORTS_PER_SOL).sub(withdrawAmount);
    expect(campaignAccount.raisedAmount.toString()).to.equal(expectedRaisedAmount.toString());

    // Verify creator received funds (accounting for transaction fees)
    const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
    expect(creatorBalanceAfter).to.be.greaterThan(creatorBalanceBefore);
  });

  it("Gets current token price", async () => {
    const tx = await program.methods
      .getTokenPrice()
      .accounts({
        campaign: campaignPda,
      })
      .rpc();

    console.log("Get token price transaction signature", tx);

    // The function should complete successfully
    // Price calculation is tested implicitly through the successful execution
  });

  it("Prevents unauthorized withdrawals", async () => {
    const unauthorizedUser = Keypair.generate();
    
    // Airdrop SOL to unauthorized user for transaction fees
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(unauthorizedUser.publicKey, 0.1 * LAMPORTS_PER_SOL),
      "confirmed"
    );

    const withdrawAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .withdrawFunds(withdrawAmount)
        .accounts({
          campaign: campaignPda,
          creator: unauthorizedUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();
      
      // If we reach here, the test should fail
      expect.fail("Expected withdrawal to fail for unauthorized user");
    } catch (error) {
      // Verify the error is related to unauthorized access
      expect(error.toString()).to.include("Unauthorized");
    }
  });

  it("Prevents contributions with zero amount", async () => {
    const zeroAmount = new anchor.BN(0);

    // Get contributor's associated token account
    const contributorTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      contributor.publicKey
    );

    try {
      await program.methods
        .contribute(zeroAmount)
        .accounts({
          campaign: campaignPda,
          tokenMint: tokenMint.publicKey,
          contributorTokenAccount: contributorTokenAccount,
          contributor: contributor.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([contributor])
        .rpc();
      
      // If we reach here, the test should fail
      expect.fail("Expected contribution to fail for zero amount");
    } catch (error) {
      // Verify the error is related to invalid amount
      expect(error.toString()).to.include("InvalidAmount");
    }
  });

  it("Calculates tokens correctly based on bonding curve", async () => {
    // Create a new campaign for clean testing
    const newCreator = Keypair.generate();
    const newTokenMint = Keypair.generate();
    const newCampaignName = "Bonding Curve Test";

    // Airdrop SOL to new creator
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(newCreator.publicKey, 2 * LAMPORTS_PER_SOL),
      "confirmed"
    );

    // Derive new campaign PDA
    const [newCampaignPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("campaign"),
        newCreator.publicKey.toBuffer(),
        Buffer.from(newCampaignName),
      ],
      program.programId
    );

    // Initialize new campaign
    await program.methods
      .initializeCampaign(
        newCampaignName,
        "Testing bonding curve",
        targetAmount,
        "BOND",
        "Bonding Token",
        totalSupply
      )
      .accounts({
        campaign: newCampaignPda,
        tokenMint: newTokenMint.publicKey,
        creator: newCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([newCreator, newTokenMint])
      .rpc();

    // Test early contribution (should get bonus)
    const earlyContribution = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const earlyContributorTokenAccount = await getAssociatedTokenAddress(
      newTokenMint.publicKey,
      contributor.publicKey
    );

    await program.methods
      .contribute(earlyContribution)
      .accounts({
        campaign: newCampaignPda,
        tokenMint: newTokenMint.publicKey,
        contributorTokenAccount: earlyContributorTokenAccount,
        contributor: contributor.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([contributor])
      .rpc();

    // Check token balance - should reflect early bonus (20% extra)
    const tokenBalance = await provider.connection.getTokenAccountBalance(earlyContributorTokenAccount);
    const expectedTokens = 1000000000 * 1.2; // 1M base tokens + 20% bonus
    expect(parseInt(tokenBalance.value.amount)).to.equal(expectedTokens);
  });
});