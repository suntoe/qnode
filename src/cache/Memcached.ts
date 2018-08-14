const NodeMemcached = require('node_memcached');
const Errors = require('qnode-beans').Errors;
import Bean from 'qnode-beans/dist/Bean';
import Context from '../ctx/Context';



// See https://github.com/chylvina/node_memcached

export default class Memcached extends Bean {

    public client:any;

    createClient( cfg:any ) {
        return NodeMemcached.createClient( cfg.port, cfg.host );
    }


    init(cfg:any) {
        const log = this._logger;

        if( !cfg.host ) throw new Error( '<memcached.host> not configured' );

        if( undefined === cfg.port ) {
            cfg.port = 11211;
            log.info( 'because <memcached.port> is undefined, it is set to default value: ' + cfg.port );
        }

        if( !cfg.expireSeconds || cfg.expireSeconds <= 0 ) {
            cfg.expireSeconds = 10;
            log.info( 'because <memcached.expireSeconds> is undefined or invalid, it is set to default value: ' + cfg.expireSeconds );
        }

        log.info( cfg, 'configuration' );

        // 创建 OCS 的 memcached 实例 
        // 其中，host 为实例的 ip 地址 
        const client = this.client = this.createClient(cfg);

        // 如果 client 发送了这个事件而没有被侦听，那么将会导致 node 进程退出。因此必须在创建 client 的时候主动侦听该事件并作出相应处理
        client.on( 'error', (err:any) => {
            if(err) log.error( {err}, 'memcached error' );
        });

        client.on( 'warning', (err:any) => {
            if(err) log.error( {err}, 'memcached warning' );
            else log.warn('password was set but none is needed and if a deprecated option / function / similar is used.');
        });

        client.on( 'connect', (err:any) => {
            if(err) log.error( {err}, 'memcached connect error' );
            else log.info('the stream is connected to the server');
        });

        client.on( 'ready', (err:any) => {
            if(err) log.error( {err}, 'memcached ready error' );
            else log.info('connection is established');
        });

        client.on( 'end', (err:any) => {
            if(err) log.error( {err}, 'memcached end error' );
            else log.info('an established Memcached server connection has closed');
        });
    }

    /**
     * JSON编码
     */
    encodeValue( ctx:Context, value:any ) {
        return JSON.stringify(value);
    }

    /**
     * JSON解码
     */
    decodeValue( ctx:Context, value:any ) {
        if( value === undefined || value === null ) return value;
        
        try {
            return JSON.parse(value);//eval('(' + json + ')');
        } catch( err ) {
            if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err );
            else this._logger.error( {err, ctx}, 'decode failure' );
        }
    }

    // 向 OCS 中写入数据 
    add( ctx:Context, key:string, value:any, encode:boolean ) {
        value = encode ? this.encodeValue( ctx, value ) : value;

        const client = this.client;

        return new Promise(function( resolve, reject ) {
            client.add( key, value, function( err:any, res:any ) { 
               if( err ) {
                    if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key, value );
                    reject(err);
                   } else {
                    resolve(res);
                }
            } );
        });
    }

    /**
     * 
     */
    set( ctx:Context, key:string, value:any, expireSeconds:number, encode:boolean ) {
        const encodedValue = encode ? this.encodeValue( ctx, value ) : value;

        const client = this.client;

        if( expireSeconds === null || expireSeconds === undefined ) {
            expireSeconds = this._config.expireSeconds;
        }

            return new Promise(function( resolve, reject ) {
                client.set( key, encodedValue, expireSeconds, function( err:any ) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key, encodedValue );
                        reject(err);
                    } else {
                        resolve(value);
                    }
                } );
            } );
    }

    /**
     * 
     */
    get( ctx:Context, key:string, decode:boolean ) {
        const me = this;

            return new Promise(function( resolve, reject ) {
                me.client.get( key, function(err:any, res:any) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key );
                        reject(err);
                    } else {
                        const value = decode ? me.decodeValue( ctx, res ) : res;
                        resolve(value);
                    }
                } );
            });
    }

    /**
     * 
     */
    increment( ctx:Context, key:string, delta:number ) {
        const client = this.client;

            return new Promise(function( resolve, reject ) {
                client.increment( key, delta, function( err:any ) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key, delta );
                        reject(err);
                    } else {
                        resolve();
                    }
                } );
            });
    }

    /**
     * 
     */
    decrement( ctx:Context, key:string, delta:number ) {
        const client = this.client;

            return new Promise(function( resolve, reject ) {
                client.decrement( key, delta, function( err:any ) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key, delta );
                        reject(err);
                    } else {
                        resolve();
                    }
                } );
            });
    }


    /**
     * 
     */
    delete( ctx:Context, key:string ) {
        const me = this;

            return new Promise(function( resolve, reject ) {
                me.client.delete( key, function(err:any) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key );
                        reject(err);
                    } else {
                        resolve();
                    }
                } );
            });
    }


    /**
     * 
     */
    replace( ctx:Context, key:string, value:any, expireSeconds:number, encode:boolean ) {
        const encodedValue = encode ? this.encodeValue( ctx, value ) : value;

        const client = this.client;

        if( expireSeconds === null || expireSeconds === undefined ) {
            expireSeconds = this._config.expireSeconds;
        }

        
            return new Promise(function( resolve, reject ) {
                client.set( key, encodedValue, expireSeconds, function( err:any ) {
                    if( err ) {
                        if( ctx ) ctx.error( Errors.INTERNAL_ERROR, err, key, encodedValue );
                        reject(err);
                    } else {
                        resolve(value);
                    }
                } );
            } );
    }
  
}
