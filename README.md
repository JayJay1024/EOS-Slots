## Getting Started
```
1. 安装git和yarn(比如在ubuntu中安装git: sudo apt-get install git)
2. 安装Chrome浏览器
3. Chrome浏览器安装Scatter插件
4. git clone git@github.com:LucienLau/EOS-Slots.git
5. cd EOS-Slots
6. yarn install
7. yarn start
```

## 说明
###### 安装eosjs库
`yarn add eosjs`
###### 引入eosjs库
`import EOS from 'eosjs'`
###### 初始化eosjs句柄
```
const network = {
    blockchain: 'eos',
    protocol: 'http',
    host: 'api.kylin.eosbeijing.one',
    port: 8880,
    chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191'  // kylin net
}

this.eosjs = Eos({
    httpEndpoint: `${network.protocol}://${network.host}:${network.port}`,
    chainId: network.chainId
});
```
###### 初始化scatter句柄
```
document.addEventListener('scatterLoaded', scatterExtension => {
    this.scatter = window.scatter;
    window.scatter = null;

    if (this.scatter && this.scatter.identity) {
        const account = this.scatter.identity.accounts.find(account => account.blockchain === 'eos');
        this.setState({ player_account: account.name });
        this.setState({ is_login: true });
    }
});
```
###### 调用scatter钱包获取账号授权
```
this.scatter.getIdentity({ accounts: [network] }).then(() => {
    const account = this.scatter.identity.accounts.find(account => account.blockchain === 'eos');
    this.setState({ player_account: account.name });
    this.setState({ is_login: true });
});
```
###### 调用scatter钱包释放账号授权
```
this.scatter.forgetIdentity().then(() => {
    this.setState({ is_login: false });
    this.setState({ player_account: 'Login' });
});
```
###### 调用scatter钱包进行转账
```
// transfer '5 EOS' to 'bbbbbbbbbbbb' from 'aaaaaaaaaaaa' e.g.
const eos = this.scatter.eos(network, Eos, {});
eos.transfer({
    from: 'aaaaaaaaaaaa',
    to: 'bbbbbbbbbbbb',
    quantity: '5.0000 EOS',
    memo: 'test'
}).then(res => {
    console.log(success);
    console.log(res);
}).catch(e => {
    console.error(e);
});
```
###### 获取合约中Table的数据
```
// 比如账号aaaaaaaaaaaa部署了一份合约，合约中定义了一个叫record的表，表的code和scope都是self，则：
this.eosjs.getTableRows({
    json: true,
    code: 'aaaaaaaaaaaa',
    scope: 'aaaaaaaaaaaa',
    table: 'record',
    // lower_bound: '2',  // 获取表中主键值大于等于2的行数据
    // upper_bound: '2',  // 获取表中主键值小于2的行数据
    // limit: 20          // 只获取20行数据
}).then(res => {
    console.log(success);
    console.log(res);
}).catch(e => {
    console.error(e);
});
```
###### 获取账户资产
```
// EOS代币在eosio.token合约的accounts表中
this.eosjs.getTableRows({
    json: true,
    code: 'eosio.token',
    scope: this.state.player_account,
    table: 'accounts'
}).then(eosBalance => {
    if ( eosBalance.rows[0] ) {
        console.log('eos balance: ', eosBalance.rows[0].balance);
    }
}).catch(e => {
    console.error(e);
})
```
