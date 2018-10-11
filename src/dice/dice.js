import React, { Component } from 'react';
import Eos from 'eosjs';
import { Layout, Select, Icon, Button, InputNumber, Message } from 'antd';
import './dice.css';
import RecordsBet from './RecordsBet';

const { Header, Content } = Layout;
const Option = Select.Option;

const network = {
    blockchain: 'eos',
    protocol: 'http',
    host: 'api.kylin.eosbeijing.one',
    port: 8880,
    chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191'  // kylin net
}
const contract_account = 'sihaiyijia11';  // 合约账号

// 开奖结果返回的index对应的种类，比如index为0对应'Tai-King'
const slot_result = ['Tai-King', 'Sai-King', 'Tai-Seven7', 'Sai-Seven7', 'Tai-Blink', 'Sai-Blink',
                     'Tai-Watermelon', 'Sai-Watermelon', 'Tai-Bell', 'Sai-Bell', 'Tai-Pumpkin', 'Sai-Pumpkin',
                     'Tai-Orange', 'Sai-Orange', 'Tai-Apple', 'Sai-Apple', '...', 'Waiting'];

class Dice extends Component {
    constructor(props) {
        super(props);

        this.state = {
            fruit_asset: {              // 记录每个种类的下注，初始为0
                king: 0,
                seven7: 0,
                blink_double: 0,
                watermelon: 0,
                bell: 0,
                pumpkin: 0,
                orange: 0,
                apple: 0,
            },
            player_asset: {             // 记录玩家各个token的资产
                eos: '0.0000 EOS',
                tpt: '0.0000 TPT',
                otc: '0.0000 OTC',
            },
            bet_asset: 0.1,          // 下注金额，默认值/最小值为0.1
            chip: 'EOS',                // 使用的token，默认EOS
            is_login: false,
            player_account: 'Login',    // 保存玩家账号，未登录时显示'Login'
            slot_result_index: 16,      // 保存开奖结果返回的index，默认16，对应的是'...'
        }

        // eosjs和scatter句柄，将在init()中初始化
        this.eosjs = null;
        this.scatter = null;

        this.init = this.init.bind(this);
        this.getPlayerAsset = this.getPlayerAsset.bind(this);

        this.getUUID = this.getUUID.bind(this);
        this.fetchSlotResult = this.fetchSlotResult.bind(this);
    }

    init = () => {
        this.eosjs = Eos({
            httpEndpoint: `${network.protocol}://${network.host}:${network.port}`,
            chainId: network.chainId
        });

        document.addEventListener('scatterLoaded', scatterExtension => {
            this.scatter = window.scatter;
            window.scatter = null;

            if (this.scatter && this.scatter.identity) {
                const account = this.scatter.identity.accounts.find(account => account.blockchain === 'eos');
                this.setState({ player_account: account.name });
                this.setState({ is_login: true });

                this.getPlayerAsset();
            }
        });
    }

    playerLoginLogout = () => {
        if ( null === this.scatter ) {
            Message.info('Must Install Scatter First');
            return;
        }

        if ( this.state.is_login && this.scatter && this.scatter.identity ) {
            this.scatter.forgetIdentity().then(() => {
                this.setState({ is_login: false });
                this.setState({ player_account: 'Login' });

                // clean asset when logout
                this.setState({
                    player_asset: {
                        eos: '0.0000 EOS',
                        tpt: '0.0000 TPT',
                        otc: '0.0000 OTC',
                    }
                });
            });
        } else if ( !this.state.is_login && this.scatter && !this.scatter.identity ) {
            this.scatter.getIdentity({ accounts: [network] }).then(() => {
                const account = this.scatter.identity.accounts.find(account => account.blockchain === 'eos');
                this.setState({ player_account: account.name });
                this.setState({ is_login: true });

                this.getPlayerAsset();
            });
        }
    }

    // 获取玩家token资产，这里只获取了eos token资产
    getPlayerAsset = () => {
        if ( !this.state.is_login || 'Login' === this.state.player_account ) {
            return;
        }

        this.eosjs.getTableRows({
            json: true,
            code: 'eosio.token',
            scope: this.state.player_account,
            table: 'accounts'
        }).then(eosBalance => {
            if ( this.state.is_login && eosBalance.rows[0] ) {  // check if is valid now
                let _player_asset = this.state.player_asset;
                _player_asset.eos = eosBalance.rows[0].balance;
                this.setState({ player_asset: _player_asset });
            }
        }).catch(e => {
            console.error(e);
        })
    }

    changeChip = (value) => {
        this.setState({ chip: value });

        // update bet and fruit asset every time the chip change
        this.setState({ bet_asset: 0.1 });
        this.setState({
            fruit_asset: {
                king: 0,
                seven7: 0,
                blink_double: 0,
                watermelon: 0,
                bell: 0,
                pumpkin: 0,
                orange: 0,
                apple: 0,
            }
        });
    }

    changeBetAsset = (value) => {    
        this.setState({ bet_asset: value });
    }

    // 2x button
    setBetAssetDouble = () => {
        let _asset = this.state.bet_asset;
        if ( _asset * 2 <= 2000 ) {
            this.setState({ bet_asset: _asset * 2 });
        }
    }

    // 1/2 button
    setBetAssetHalf = () => {
        let _asset = this.state.bet_asset;
        if ( _asset / 2.0 >= 0.1 ) {
            this.setState({ bet_asset: _asset / 2.0 });
        }
    }

    // Max button
    setBetAssetMax = () => {
        this.setState({ bet_asset: 2000 });
    }

    // Min button
    setBetAssetMin = () => {
        this.setState({ bet_asset: 0.1 });
    }

    // 'Let's Start' button
    betStart = () => {
        if ( !this.state.is_login || 'Login' === this.state.player_account ) {
            Message.warning('Please Login First');
            return;
        }

        let _quantity = 0.0;
        let _uid = this.getUUID(8, 10);
        let _memo = 'uid:' + _uid;

        if ( 0 !== this.state.fruit_asset.king ) {
            _quantity += this.state.fruit_asset.king;
            _memo = _memo + ';' + '0:' + this.state.fruit_asset.king * 10000;
        }
        if ( 0 !== this.state.fruit_asset.seven7 ) {
            _quantity += this.state.fruit_asset.seven7;
            _memo = _memo + ';' + '1:' + this.state.fruit_asset.seven7 * 10000;
        }
        if ( 0 !== this.state.fruit_asset.blink_double ) {
            _quantity += this.state.fruit_asset.blink_double;
            _memo = _memo + ';' + '2:' + this.state.fruit_asset.blink_double * 10000;
        }
        if ( 0 !== this.state.fruit_asset.watermelon ) {
            _quantity += this.state.fruit_asset.watermelon;
            _memo = _memo + ';' + '3:' + this.state.fruit_asset.watermelon * 10000;
        }
        if ( 0 !== this.state.fruit_asset.bell ) {
            _quantity += this.state.fruit_asset.bell;
            _memo = _memo + ';' + '4:' + this.state.fruit_asset.bell * 10000;
        }
        if ( 0 !== this.state.fruit_asset.pumpkin ) {
            _quantity += this.state.fruit_asset.pumpkin;
            _memo = _memo + ';' + '5:' + this.state.fruit_asset.pumpkin * 10000;
        }
        if ( 0 !== this.state.fruit_asset.orange ) {
            _quantity += this.state.fruit_asset.orange;
            _memo = _memo + ';' + '6:' + this.state.fruit_asset.orange * 10000;
        }
        if ( 0 !== this.state.fruit_asset.apple ) {
            _quantity += this.state.fruit_asset.apple;
            _memo = _memo + ';' + '7:' + this.state.fruit_asset.apple * 10000;
        }

        // check select
        if ( 0 === _quantity ) {
            Message.warning('Must Select a Slot');
            return;
        }

        // check overdrawn balance
        if ( _quantity > this.state.player_asset.eos.split(' ')[0] * 1.0 ) {
            Message.info('Overdrawn Balance');
            return;
        }

        const eos = this.scatter.eos(network, Eos, {});
        eos.transfer({
            from: this.state.player_account,
            to: contract_account,
            quantity: Number(_quantity).toFixed(4) + ' EOS',
            memo: _memo
        }).then(res => {
            Message.success('Slot Bet Success');
            this.setState({ slot_result_index: 17 });   // 17对应'Waiting'
            this.getPlayerAsset();                      // update asset after bet
            this.fetchSlotResult(_uid * 1);             // fetch result
        }).catch(e => {
            Message.error(e.message);
        });
    }

    getUUID = ( len, radix ) => {
        var chars = '1123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
        } else {
            // rfc4122, version 4 form
            var r;
            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';
            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random()*16;
                    uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        return uuid.join('');
    }

    fetchSlotResult = (uuid, lower = '') => {
        this.eosjs.getTableRows({
            json: true,
            code: contract_account,
            scope: contract_account,
            table: 'record',
            lower_bound: lower
        }).then(res => {
            if ( res.rows[0] ) {

                // find match uuid
                let _rows_length = res.rows.length;
                let i = _rows_length - 1;
                for ( ; i >= 0; i-- ) {
                    if ( res.rows[i].uuid === uuid ) {
                        this.setState({ slot_result_index: res.rows[i].result * 1 });
                        break;
                    }
                }

                // not found, again
                if ( i < 0 ) {
                    if ( res.more ) {
                        this.fetchSlotResult(uuid, res.rows[_rows_length - 1].id);
                    } else {
                        this.fetchSlotResult(uuid);
                    }
                }
            }
        }).catch(e => {
            console.error(e);
            setTimeout(this.fetchSlotResult(uuid), 1000);  // again 1s later
        });
    }

    //**************************************************************************************
    //***********************  update fruit asset that the fruit player choose *************
    chooseFruitA = () => {
        console.log('King');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.king ) {
            _fruit_asset.king *= 2;
        } else {
            _fruit_asset.king = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitB = () => {
        console.log('Seven7');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.seven7 ) {
            _fruit_asset.seven7 *= 2;
        } else {
            _fruit_asset.seven7 = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitC = () => {
        console.log('Blink_double');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.blink_double ) {
            _fruit_asset.blink_double *= 2;
        } else {
            _fruit_asset.blink_double = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitD = () => {
        console.log('Watermelon');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.watermelon ) {
            _fruit_asset.watermelon *= 2;
        } else {
            _fruit_asset.watermelon = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitE = () => {
        console.log('Bell');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.bell ) {
            _fruit_asset.bell *= 2;
        } else {
            _fruit_asset.bell = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitF = () => {
        console.log('Pumpkin');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.pumpkin ) {
            _fruit_asset.pumpkin *= 2;
        } else {
            _fruit_asset.pumpkin = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitG = () => {
        console.log('Orange');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.orange ) {
            _fruit_asset.orange *= 2;
        } else {
            _fruit_asset.orange = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    chooseFruitH = () => {
        console.log('Apple');
        let _bet_asset = this.state.bet_asset;
        let _fruit_asset = this.state.fruit_asset;
        if ( _fruit_asset.apple ) {
            _fruit_asset.apple *= 2;
        } else {
            _fruit_asset.apple = _bet_asset;
        }
        this.setState({ fruit_asset: _fruit_asset });
    }
    //**************************************************************************************

    componentDidMount() {
        this.init();
    }

    render() {

        return (
            <div>
                <Layout className='layout'>
                    <Header>
                        <a href='#' onClick={this.playerLoginLogout.bind(this)} className='login-logout'>
                            {
                                this.state.is_login === true ?
                                <span><Icon type='user'/> {this.state.player_account}</span> :
                                <span><Icon type='login'/> {this.state.player_account}</span>
                            }
                        </a>
                        <span className='player-asset'>Asset: {this.state.player_asset.eos}</span>
                        <span className='player-asset'>,&nbsp;&nbsp;&nbsp;&nbsp;{this.state.player_asset.tpt}</span>
                        <span className='player-asset'>,&nbsp;&nbsp;&nbsp;&nbsp;{this.state.player_asset.otc}</span>
                    </Header>
                    <Content>
                        <div className='dice-result'>Slots Result Is "{slot_result[this.state.slot_result_index]}"</div>
                        <div className='dice-input-box'>
                            <div className='chip'>
                                <Select
                                    defaultValue={this.state.chip}
                                    onChange={this.changeChip.bind(this)}
                                >
                                    <Option value="EOS">EOS</Option>
                                    <Option value="TPT">TPT</Option>
                                    <Option value="OTC">OTC</Option>
                                </Select>
                            </div>
                            <div className='asset-input-box'>
                                <InputNumber
                                    min={0.1}
                                    max={2000}
                                    defaultValue={0.1}
                                    precision={4}
                                    step={0.5}
                                    onChange={this.changeBetAsset.bind(this)}
                                    className='asset-input'
                                    value={this.state.bet_asset}
                                />
                                <Button className='asset-multiple' onClick={this.setBetAssetDouble.bind(this)}>2x</Button>
                                <Button className='asset-multiple' onClick={this.setBetAssetHalf.bind(this)}>1/2</Button>
                                <Button className='min-max' onClick={this.setBetAssetMax.bind(this)}>Max</Button>
                                <Button className='min-max' onClick={this.setBetAssetMin.bind(this)}>Min</Button>
                            </div>
                        </div>
                        <div className='fruits-box'>
                            <span className='fruit-quantity'>{this.state.fruit_asset.king}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.seven7}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.blink_double}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.watermelon}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.bell}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.pumpkin}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.orange}</span>
                            <span className='fruit-quantity'>{this.state.fruit_asset.apple}</span>
                            <Button className='fruit-btn' onClick={this.chooseFruitA.bind(this)}>King</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitB.bind(this)}>Seven7</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitC.bind(this)}>Blink</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitD.bind(this)}>Watermelon</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitE.bind(this)}>Bell</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitF.bind(this)}>Pumpkin</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitG.bind(this)}>Orange</Button>
                            <Button className='fruit-btn' onClick={this.chooseFruitH.bind(this)}>Apple</Button>
                        </div>
                        <div className='bet-start'>
                            <Button
                                size='large'
                                type='primary'
                                onClick={this.betStart.bind(this)}
                            >
                                Let's Start
                            </Button>
                        </div>
                        <RecordsBet />
                    </Content>
                </Layout>
            </div>
        );
    }
}

export default Dice;