import React, { Component } from 'react';
import { Table } from 'antd';
import Eos from 'eosjs';
import './RecordsBet.css';

const network = {
    blockchain: 'eos',
    protocol: 'http',
    host: 'api.kylin.eosbeijing.one',
    port: 8880,
    chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191'  // kylin net
}
const contract_account = 'sihaiyijia11';

// const bet_slot = ['King', 'Seven7', 'Blink', 'Watermelon', 'Bell', 'Pumpkin', 'Orange', 'Apple'];

Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

class RecordsBet extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data_records: [],
            history_record_data: [],
        }

        this.eosjs = null;
        this.sortRecordData = this.sortRecordData.bind(this);
        this.fetchSlotRecord = this.fetchSlotRecord.bind(this);
    }

    fetchSlotRecord = (lower = '') => {
        this.eosjs.getTableRows({
            json: true,
            code: contract_account,
            scope: contract_account,
            table: 'record',
            limit: 20,
            lower_bound: lower
        }).then(res => {
            if ( res.rows.length > 0 ) {
                if ( res.more ) {
                    this.setState({ history_record_data: [] });  // clear
                }

                const _data = this.state.history_record_data;
                for ( let i = 0; i < res.rows.length; i++ ) {
                    _data.push({
                        key: _data.length,
                        txtime: new Date(res.rows[i].time*1000).Format('MM/dd hh:mm:ss'),
                        account: res.rows[i].player,
                        quantity: res.rows[i].quantity,
                        payout: res.rows[i].win,
                    });
                }
                this.setState({ history_record_data: _data });

                if ( false === res.more ) {
                    this.setState({ data_records: this.state.history_record_data.sort(this.sortRecordData) });
                }
            }

            if ( res.more ) {
                setTimeout(this.fetchSlotRecord( res.rows[res.rows.length - 1].id + 1 ), 1000);
            } else {
                setTimeout(this.fetchSlotRecord, 1000);
                this.setState({ history_record_data: [] });  // clear
            }
        }).catch(e => {
            console.error(e);
            setTimeout(this.fetchSlotRecord, 2000);
            this.setState({ history_record_data: [] });  // clear
        });
    }

    sortRecordData = (a, b) => {
        return b.key - a.key;
    }

    componentDidMount = () => {
        this.eosjs = Eos({
            httpEndpoint: `${network.protocol}://${network.host}:${network.port}`,
            chainId: network.chainId
        });
        this.fetchSlotRecord();
    }

    render() {

        const columns = [{
            key: 'txtime',
            dataIndex: 'txtime',
            title: 'Time',
            align: 'center',
            width: '25%',
        }, {
            key: 'account',
            dataIndex: 'account',
            title: 'Player',
            align: 'center',
            width: '25%',
        }, {
            key: 'quantity',
            dataIndex: 'quantity',
            title: 'EOS',
            align: 'center',
            width: '25%',
        }, {
            key: 'payout',
            dataIndex: 'payout',
            title: 'Payout',
            align: 'center',
            width: '25%',
        }];

        return (
            <div className='tb-records-bet'>
                <Table
                    loading={this.state.data_records.length <= 0 ? true : false}
                    columns={columns}
                    dataSource={this.state.data_records}
                    pagination={false}
                    scroll={{ y: 480 }}
                />
            </div>
        );
    }
}

export default RecordsBet;