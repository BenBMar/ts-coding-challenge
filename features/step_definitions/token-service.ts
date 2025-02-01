import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, AccountId, Client, PrivateKey, 
  TokenCreateTransaction, TokenInfoQuery, TokenMintTransaction, TransferTransaction ,TransactionId,Status
       } from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet();

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  // Create the query request
  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

When(/^I create a token named Test Token \(HTT\)$/, async function () { 
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  const createTokenTx = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(0)
    .setTreasuryAccountId(MY_ACCOUNT_ID)
    .setSupplyKey(MY_PRIVATE_KEY)
    .freezeWith(client)
    .sign(MY_PRIVATE_KEY);

  const createTokenSubmit = await createTokenTx.execute(client);
  const createTokenReceipt = await createTokenSubmit.getReceipt(client);
  this.tokenId = createTokenReceipt.tokenId;
});

Then(/^The token has the name "([^"]*)"$/, async function (expectedName: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.name, expectedName);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedSymbol: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.symbol, expectedSymbol);
});

Then(/^The token has (\d+) decimals$/, async function (decimals: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.decimals, decimals);
});

Then(/^The token is owned by the account$/, async function () {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  const account = accounts[0];
  assert.strictEqual(tokenInfo.treasuryAccountId?.toString(), AccountId.fromString(account.id).toString());
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (amount: number) {
  const account = accounts[0];
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  const mintTx = await new TokenMintTransaction()
    .setTokenId(this.tokenId)
    .setAmount(amount)
    .freezeWith(client)
    .sign(MY_PRIVATE_KEY);

  const mintSubmit = await mintTx.execute(client);
  const mintReceipt = await mintSubmit.getReceipt(client);
  assert.strictEqual(mintReceipt.status, Status.Success);

  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.totalSupply.toNumber(), amount);
});

When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  const createTokenTx = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(supply)
    .setTreasuryAccountId(MY_ACCOUNT_ID)
    .freezeWith(client)
    .sign(MY_PRIVATE_KEY);

  const createTokenSubmit = await createTokenTx.execute(client);
  const createTokenReceipt = await createTokenSubmit.getReceipt(client);
  this.tokenId = createTokenReceipt.tokenId;
});

Then(/^The total supply of the token is (\d+)$/, async function (supply: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.totalSupply.toNumber(), supply);
});

Then(/^An attempt to mint tokens fails$/, { timeout: 60 * 1000 }, async function () {
  try {
    const mintTx = await new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(100)
      .execute(client);
    await mintTx.getReceipt(client);
    assert.fail("Minting should have failed");
  } catch (error) {
    assert.ok((error as Error).message.includes("TOKEN_HAS_NO_SUPPLY_KEY"));
  }
});

Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0];
  client.setOperator(
    AccountId.fromString(account.id),
    PrivateKey.fromStringED25519(account.privateKey)
  );
  const balance = await new AccountBalanceQuery().setAccountId(account.id).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  this.firstAccount = account;
});

Given(/^A second Hedera account$/, async function () {
  this.secondAccount = accounts[1];
});

Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  const createTokenTx = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(supply)
    .setTreasuryAccountId(MY_ACCOUNT_ID)
    .freezeWith(client)
    .sign(MY_PRIVATE_KEY);

  const createTokenSubmit = await createTokenTx.execute(client);
  const createTokenReceipt = await createTokenSubmit.getReceipt(client);
  this.tokenId = createTokenReceipt.tokenId;
});

Given(/^The first account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.firstAccount.id).execute(client);
  const tokens = balance.tokens?.get(this.tokenId);
  assert.strictEqual(tokens?.toNumber(), expected);
});

Given(/^The second account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.secondAccount.id).execute(client);
  const tokens = balance.tokens?.get(this.tokenId);
  assert.strictEqual(tokens?.toNumber(), expected);
});

Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0];
  client.setOperator(
    AccountId.fromString(account.id),
    PrivateKey.fromStringED25519(account.privateKey)
  );
  const balance = await new AccountBalanceQuery().setAccountId(account.id).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  this.firstAccount = account;
});

Given(/^A second Hedera account$/, async function () {
  this.secondAccount = accounts[1];
});

Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);

  const createTokenTx = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(supply)
    .setTreasuryAccountId(MY_ACCOUNT_ID)
    .freezeWith(client)
    .sign(MY_PRIVATE_KEY);

  const createTokenSubmit = await createTokenTx.execute(client);
  const createTokenReceipt = await createTokenSubmit.getReceipt(client);
  this.tokenId = createTokenReceipt.tokenId;
});

Given(/^The first account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.firstAccount.id).execute(client);
  const tokens = balance.tokens?.get(this.tokenId);
  assert.strictEqual(tokens?.toNumber(), expected);
});

Given(/^The second account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.secondAccount.id).execute(client);
  const tokens = balance.tokens?.get(this.tokenId);
  assert.strictEqual(tokens?.toNumber(), expected);
});
When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (amount: number) {
  const tokenId = this.tokenId;
  const firstAccount = this.firstAccount;
  const secondAccount = this.secondAccount;

  this.transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, firstAccount.id, -amount)
    .addTokenTransfer(tokenId, secondAccount.id, amount)
    .freezeWith(client)
    .sign(PrivateKey.fromStringED25519(firstAccount.privateKey));
});

When(/^The first account submits the transaction$/, async function () {
  const transferSubmit = await this.transferTx.execute(client);
  this.transferReceipt = await transferSubmit.getReceipt(client);
});

When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  const tokenId = this.tokenId;
  const firstAccount = this.firstAccount;
  const secondAccount = this.secondAccount;

  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, secondAccount.id, -amount)
    .addTokenTransfer(tokenId, firstAccount.id, amount)
    .setTransactionId(TransactionId.generate(secondAccount.id)) // Set the transaction ID with the payer's account ID
    .freezeWith(client);

  await transferTx.sign(PrivateKey.fromStringED25519(secondAccount.privateKey));
  await transferTx.sign(PrivateKey.fromStringED25519(firstAccount.privateKey));

  this.signedTransferTx = transferTx;
});

Then(/^The first account has paid for the transaction fee$/, async function () {
  const initialBalance = this.firstAccountInitialHbar;
  const newBalance = await new AccountBalanceQuery()
    .setAccountId(this.firstAccount.id)
    .execute(client);
  assert.ok(newBalance.hbars.toBigNumber().lt(initialBalance));
});

Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (hbar: number, tokens: number) {
  const account = accounts[0];
  client.setOperator(
    AccountId.fromString(account.id),
    PrivateKey.fromStringED25519(account.privateKey)
  );
  const balance = await new AccountBalanceQuery()
    .setAccountId(account.id)
    .execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > hbar);
  this.firstAccount = account;

  const tokenBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;
  assert.strictEqual(tokenBalance, tokens);
});

Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbar: number, tokens: number) {
  const account = accounts[1];
  const balance = await new AccountBalanceQuery()
    .setAccountId(account.id)
    .execute(client);
  assert.strictEqual(balance.hbars.toBigNumber().toNumber(), hbar);
  const tokenBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;
  assert.strictEqual(tokenBalance, tokens);
  this.secondAccount = account;
});

Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbar: number, tokens: number) {
  const account = accounts[2];
  const balance = await new AccountBalanceQuery()
    .setAccountId(account.id)
    .execute(client);
  assert.strictEqual(balance.hbars.toBigNumber().toNumber(), hbar);
  const tokenBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;
  assert.strictEqual(tokenBalance, tokens);
  this.thirdAccount = account;
});

Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbar: number, tokens: number) {
  const account = accounts[3];
  const balance = await new AccountBalanceQuery()
    .setAccountId(account.id)
    .execute(client);
  assert.strictEqual(balance.hbars.toBigNumber().toNumber(), hbar);
  const tokenBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;
  assert.strictEqual(tokenBalance, tokens);
  this.fourthAccount = account;
});

When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (debit: number, credit1: number, credit2: number) {
  const tokenId = this.tokenId;
  const firstAccount = this.firstAccount;
  const secondAccount = this.secondAccount;
  const thirdAccount = this.thirdAccount;
  const fourthAccount = this.fourthAccount;

  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, firstAccount.id, -debit)
    .addTokenTransfer(tokenId, secondAccount.id, -debit)
    .addTokenTransfer(tokenId, thirdAccount.id, credit1)
    .addTokenTransfer(tokenId, fourthAccount.id, credit2)
    .freezeWith(client);

  transferTx.sign(PrivateKey.fromStringED25519(firstAccount.privateKey));
  transferTx.sign(PrivateKey.fromStringED25519(secondAccount.privateKey));

  this.transferTx = transferTx;
});

Then(/^The third account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery()
    .setAccountId(this.thirdAccount.id)
    .execute(client);
  const tokens = balance.tokens?.get(this.tokenId)?.toNumber();
  assert.strictEqual(tokens, expected);
});

Then(/^The fourth account holds (\d+) HTT tokens$/, async function (expected: number) {
  const balance = await new AccountBalanceQuery()
    .setAccountId(this.fourthAccount.id)
    .execute(client);
  const tokens = balance.tokens?.get(this.tokenId)?.toNumber();
  assert.strictEqual(tokens, expected);
});
