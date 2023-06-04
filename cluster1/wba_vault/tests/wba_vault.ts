import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { WbaVault, IDL } from "../target/types/wba_vault";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
  mintTo,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

describe("wba_vault", () => {
  // Configure the client to use the local cluster.
  // Configure the client to use the local cluster.
  const keypair = anchor.web3.Keypair.generate();

  const connection = new anchor.web3.Connection("http://localhost:8899");
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair),
    { commitment: "finalized" }
  );
  // Program address
  const programAddress = new anchor.web3.PublicKey(
    "EK5MYUPp2y8KnnhCWBNMGYYkCK1k8sib4WgkWkzE6FD5"
  );

  // Create program
  const program = new Program<WbaVault>(IDL, programAddress, provider);

  // Create PDA VAULT STATE
  const vaultState = anchor.web3.Keypair.generate();

  // Create PDA VAULT AUTH
  const vault_auth_seeds = [
    Buffer.from("auth"),
    vaultState.publicKey.toBuffer(),
  ];
  const vaultAuth = anchor.web3.PublicKey.findProgramAddressSync(
    vault_auth_seeds,
    program.programId
  )[0];

  // Create Vault system Program
  const vault_seeds = [Buffer.from("vault"), vaultAuth.toBuffer()];
  const vault = anchor.web3.PublicKey.findProgramAddressSync(
    vault_seeds,
    program.programId
  )[0];

  it("Airdrop", async () => {
    // 1. Airdrop 100 SOL to payer
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      0.2 * 1_000_000_000
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      "finalized"
    );
  });

  it("Initialize!", async () => {
    // Add your test here.
    try {
      const txhash = await program.methods
        .initialize()
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          vault: vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair, vaultState])
        .rpc();
      console.log(`Success! Check out your TX here: 
          https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  });

  it("Deposit", async () => {
    try {
      const txhash = await program.methods
        .deposit(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1))
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          vault: vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();
      console.log(`Deposited! Check out your TX here: 
      https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch (e) {
      console.error(e);
    }
  });

  it("Withdraw", async () => {
    try {
      const txhash = await program.methods
        .withdraw(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.05))
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          vault: vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();
      console.log(`Withdraw! Check out your TX here: 
      https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch (e) {
      console.error(e);
    }
  });

  it("Deposit SPL", async () => {
    // Add your test here.
    //Create a new mint account with our wallet as init payer, mint authority and freeze authority
    let mint = await createMint(
      provider.connection,
      keypair,
      keypair.publicKey,
      keypair.publicKey,
      6
    );
    console.log("Mint ID: ", mint.toString());

    //create our associated token account
    let ataFrom = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      keypair,
      mint,
      keypair.publicKey
    );
    console.log("ATA From: ", ataFrom.address.toString());

    //create the recipient token account
    let ataTo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      keypair,
      mint,
      vaultAuth,
      true
    );
    console.log("ATA To: ", ataTo.address.toString());

    //Mint SPL Tokens to our account (ATA)
    let tx = await mintTo(
      provider.connection,
      keypair,
      mint,
      ataFrom.address,
      keypair,
      LAMPORTS_PER_SOL * 2
    );

    //Log our mint transaction
    console.log("Token minted: ", tx);

    try {
      const txhash = await program.methods
        .depositSpl(new BN(LAMPORTS_PER_SOL * 1))
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          systemProgram: SystemProgram.programId,
          ownerAta: ataFrom.address,
          vaultAta: ataTo.address,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keypair])
        .rpc();
      console.log(`Success! Check out your TX here: 
      https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
      let accountBalance = (
        await provider.connection.getTokenAccountBalance(ataTo.address)
      ).value.amount;
      console.log("\nSPL Balance: ", accountBalance);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  });

  it("Withdraw SPL", async () => {
    // Add your test here.
    //Create a new mint account with our wallet as init payer, mint authority and freeze authority
    let mint = await createMint(
      provider.connection,
      keypair,
      keypair.publicKey,
      keypair.publicKey,
      6
    );
    console.log("Mint ID: ", mint.toString());

    //create our associated token account
    let ataFrom = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      keypair,
      mint,
      keypair.publicKey
    );
    console.log("ATA From: ", ataFrom.address.toString());

    //create the recipient token account
    let ataTo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      keypair,
      mint,
      vaultAuth,
      true
    );
    console.log("ATA To: ", ataFrom.address.toString());

    //Mint SPL Tokens to our account (ATA)
    let tx = await mintTo(
      provider.connection,
      keypair,
      mint,
      ataFrom.address,
      keypair,
      LAMPORTS_PER_SOL * 2
    );

    //Log our mint transaction
    console.log("Token minted: ", tx);

    try {
      const txhash = await program.methods
        .depositSpl(new BN(LAMPORTS_PER_SOL * 1))
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          systemProgram: SystemProgram.programId,
          ownerAta: ataFrom.address,
          vaultAta: ataTo.address,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keypair])
        .rpc();
      console.log(`\nSPL Deposit Success! Check out your TX here: 
      https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
      let accountBalance = (
        await provider.connection.getTokenAccountBalance(ataTo.address)
      ).value.amount;
      console.log("SPL Balance: ", accountBalance);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }

    try {
      const txhash = await program.methods
        .withdrawSpl(new BN(LAMPORTS_PER_SOL * 1))
        .accounts({
          owner: keypair.publicKey,
          vaultState: vaultState.publicKey,
          vaultAuth: vaultAuth,
          systemProgram: SystemProgram.programId,
          ownerAta: ataFrom.address,
          vaultAta: ataTo.address,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keypair])
        .rpc();
      console.log(`\n\nSPL Withdraw Success! Check out your TX here: 
      https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
      let accountBalance = (
        await provider.connection.getTokenAccountBalance(ataTo.address)
      ).value.amount;
      console.log("SPL Balance: ", accountBalance);
    } catch (e) {
      console.error(`Oops, something went wrong: ${e}`);
    }
  });
});
