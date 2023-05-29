import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
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
});
