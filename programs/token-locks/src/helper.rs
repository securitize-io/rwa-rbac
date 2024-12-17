use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;

// Calculates additional lamports needed for account realloc and transfers them payer
// from to target.
pub fn transfer_lamports_for_realloc<'info>(
    payer: AccountInfo<'info>,
    target: AccountInfo<'info>,
    new_len: usize,
) -> Result<()> {
    // Calculate additional lamports needed for new account size.
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_len);
    let lamports_diff = new_minimum_balance.saturating_sub(target.lamports());

    // Transfer additional lamports to target.
    if lamports_diff > 0 {
        let ix = transfer(payer.key, target.key, lamports_diff);
        invoke(&ix, &[payer, target])?;
    }
    Ok(())
}
