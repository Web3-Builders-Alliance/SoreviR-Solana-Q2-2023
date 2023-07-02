use std::{collections::BTreeMap};

use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, TokenAccount, Token, Transfer, transfer}, associated_token::AssociatedToken};

use crate::{errors::EscrowError, state::Escrow};



#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {

    #[account(mut)]
    pub maker: Signer<'info>, // signer of the transaction
    /// CHECK: This is not dangerous because this account doesn't exist
    pub taker: UncheckedAccount<'info>, 

    #[account(
        mut,
        associated_token::mint = maker_token,
        associated_token::authority = maker,
    )]
    pub maker_ata: Account<'info, TokenAccount>, // associated token account for maker account
    
    pub maker_token: Box<Account<'info, Mint>>,
    pub taker_token: Box<Account<'info, Mint>>, // could be a unchecked account
    
    /// CHECK: This is not dangerous because this account doesn't exist
    #[account(
        seeds =[b"auth"],
        bump
    )]
    pub auth: UncheckedAccount<'info>,  // required for the program to sign

    #[account(
        init,
        payer = maker,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = maker_token,
        token::authority = auth,
    )]
    pub vault: Account<'info, TokenAccount>,    // is a token account that holds token A

    #[account(
        init,
        payer = maker,
        seeds = [b"escrow", maker.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump, 
        space = Escrow::LEN,
    )]
    pub escrow: Account<'info, Escrow>, //  holds all the data for a single instance of the escrow program

    pub token_program: Program<'info, Token>,                       // it has the instructions to handle (move) tokens
    pub system_program: Program<'info, System>,                     // program on chain that can create accounts. Everytime we use "init", se need it
    pub associated_token_program: Program<'info, AssociatedToken>   // to initialize the vault account
}


impl<'info> Make<'info> {
    pub fn init(&mut self, bumps: &BTreeMap<String, u8>, seed: u64) -> Result<()> {
        let escrow = &mut self.escrow;
        escrow.maker = *self.maker.key;
        escrow.taker = *self.taker.key;
        escrow.maker_token = *self.maker_token.to_account_info().key;
        escrow.taker_token = *self.taker_token.to_account_info().key;
        escrow.seed = seed;
        escrow.auth_bump = *bumps.get("auth").ok_or(EscrowError::AuthBumpError)?;
        escrow.vault_bump = *bumps.get("vault").ok_or(EscrowError::VaultBumpError)?;
        escrow.escrow_bump = *bumps.get("escrow").ok_or(EscrowError::EscrowBumpError)?;
        Ok(())
    }

    pub fn transfer_to_vault(
        &self,
        amount: u64
    ) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.maker_ata.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };
        let ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        transfer(ctx, amount)
    }
}