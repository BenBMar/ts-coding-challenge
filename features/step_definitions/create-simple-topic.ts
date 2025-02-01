import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey, RequestType,
  TopicCreateTransaction, TopicInfoQuery,
  TopicMessageQuery, TopicMessageSubmitTransaction,
  KeyList
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;

// Pre-configured client for test network (testnet)
const client = Client.forTestnet()

//Set the operator with the account ID and private key

Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[0]
  const account: AccountId = AccountId.fromString(acc.id);
  this.account = account
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey = privKey
  client.setOperator(this.account, privKey);

//Create the query request
  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  const transaction = await new TopicCreateTransaction().setTopicMemo(memo).setSubmitKey(this.privKey.publicKey).execute(client);
  const receipt = await transaction.getReceipt(client);
  this.topicId = receipt.topicId;  
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const transaction = await new TopicMessageSubmitTransaction()
    .setTopicId(this.transaction.topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
  //this.sequenceNumber = record.consensusMessageReceipt.sequenceNumber;
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (message: string) {
  new TopicMessageQuery()
      .setTopicId(this.topic.topicId)
      .subscribe(
          client,
          (msg) => {
            assert.ok(msg?.contents.toString() == message)
            console.log(`Received message: ${msg?.contents.toString()}`)
          },
          (error) => console.log(`Error: ${error.toString()}`)
      );});

Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[1];
  const account = AccountId.fromString(acc.id);
  this.account2 = account;
  const privKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey2 = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold :number) {
  //const publicKey1 = this.privKey.publicKey;
  //const publicKey2 = this.privKey2.publicKey;
  const key1 = PrivateKey.fromStringED25519(accounts[0].privateKey);
  const publicKey1 = key1.publicKey;

  const key2 = PrivateKey.fromStringED25519(accounts[1].privateKey);
  const publicKey2 = key2.publicKey;  

  this.thresholdKeys = new KeyList([publicKey1, publicKey2], 2);
});

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, async function (memo: string) {
  const topic = await (await new TopicCreateTransaction().setTopicMemo(memo).setSubmitKey(this.thresholdKeys.publicKey).execute(client)).getReceipt(client)
  this.topic = topic
  assert.ok(topic.topicId)
  const topicInfo = await new TopicInfoQuery().setTopicId(topic.topicId).execute(client)
  assert.ok(topicInfo.topicMemo == memo)
});

