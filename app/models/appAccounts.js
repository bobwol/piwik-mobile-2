
/** @private */
var storage = require('Piwik/App/Storage');
var Piwik   = require('Piwik');


exports.definition = {

    config: {
        "columns": {
            "id":"string",
            "accessUrl":"string",
            "username":"string",
            "tokenAuth":"string",
            "name":"string",
            "active":"boolean",
            "createVersionNumber":"string",
            "changeVersionNumber":"string",
            "version":"string",
            "dateVersionUpdated":"string"
        },
        "adapter": {
            "type": "properties",
            "collection_name": "appaccounts"
        }
    },      

    extendModel: function(Model) {      
        _.extend(Model.prototype, {
            
            defaults: {
              //  id: Ti.Platform.createUUID(),
                active: true,
                createVersionNumber: Ti.App.version,
                changeVersionNumber: Ti.App.version,
            },
            
            initialize: function () {
                this.on('change:accessUrl', this.completeAccessUrl)
            },
            
            completeAccessUrl: function (accountModel, accessUrl) {
                
                if (!accessUrl) {
                    return;
                }
                
                var lastUrlChar   = accessUrl.substr(accessUrl.length - 1, 1);
                var last4UrlChars = accessUrl.substr(accessUrl.length -4, 4).toLowerCase();

                if ('/' !== lastUrlChar && '.php' !== last4UrlChars) {
                    // append a slash if user entered an url like 'http://demo.piwik.org' . Do not append if user entered an url
                    // like 'http://demo.piwik.org/index.php'
                    accessUrl = accessUrl + '/';
                } 
                
                lastUrlChar = accessUrl.substr(accessUrl.length - 1, 1);
                
                if ('/' === lastUrlChar) {
                    // if url doesn't end with *.php, append index.php automatically. we do not verify whether it ends with
                    // index.php so the user is able to use for example xyz.php
                    accessUrl = accessUrl + 'index.php';
                }
                
                accountModel.set({accessUrl: accessUrl}, {silent: true});
            },
            
            validate: function () {
                if (this.get('username') && !this.get('password')) {
                    return 'MissingPassword';
                    
                } else if (!this.get('username') && this.get('password')) {
                    return 'MissingUsername';
                }
                
                var accessUrl = this.get('accessUrl');
                if (!accessUrl || 'http' !== accessUrl.substr(0, 4).toLowerCase()) {
            
                    return 'InvalidUrl';
                }
            },

            resetPiwikVersion: function () {
                
                this.set({version: 0, dateVersionUpdated: ''});
                
                return this;
            },

            updatePiwikVersion: function() {
                var dateVersionUpdated = this.get('dateVersionUpdated');
                if (!dateVersionUpdated) {
                    // version not updated yet. Set it to null. new Date(null) will be Jan 01 1970 and therefore force an update
                    dateVersionUpdated = null;
                }
            
                var dateNow             = (new Date()).toDateString();
                var lastUpdatedDate     = new Date(dateVersionUpdated);
                var alreadyUpdatedToday = dateNow == lastUpdatedDate.toDateString();
            
                if (alreadyUpdatedToday) {
                    // request it max once per day
                    
                    return;
                }
                
                var that = this;
                var version = Alloy.createCollection('piwikVersion');
                version.fetch({
                    success : function(model, response) {

                        that.set({dateVersionUpdated: (new Date()) + ''});
                        
                        if (response) {
                            var stringUtils = Piwik.require('Utils/String');
                            that.set({version: stringUtils.toPiwikVersion(response.value)});
                            stringUtils     = null;
                        } else if (!account.version) {
                            that.set({version: 0});
                        } else {
                            // there went something wrong with the request. For example the network connection broke up.
                            // do not set account version to 0 in such a case. We would overwrite an existing version, eg 183
                        }
                        
                        that.save();
                    },
                    error : function(model, resp) {
                        alert('Error 1');
                    }
                });
            },
            
            requestAuthToken: function () {
                var username = this.get('username');
                var password = this.get('password');
                var account  = this;
                
                if (!username && !password) {
                    this.set({tokenAuth: 'anonymous'});
                } else {
                    // fetch token via API
                    var tokenAuth = Alloy.createCollection('piwikTokenAuth');
                    tokenAuth.fetch({
                        account: this,
                        params: {userLogin: username, md5Password: Ti.Utils.md5HexDigest(password)},
                        success: function (model, response) {
                            var _ = require("alloy/underscore");
            
                            if (!response || !_.isObject(response) || !response.value) {
                    
                                return account.trigger('error', 'ReceiveAuthTokenError');
                            }
                            
                            account.set({tokenAuth: response.value});
                
                        }, error: function () {
                            return account.trigger('error', 'ReceiveAuthTokenError');
                        }
                    });
                }
            }

        }); // end extend
        
        return Model;
    },
    
    
    extendCollection: function(Collection) {
        _.extend(Collection.prototype, {

            getNumAccounts: function () {
                return this.length;
            },
            
            hasActivatedAccount: function () {
                return !!this.where({active: 1});
            }

            
        }); // end extend
        
        return Collection;
    }
        
}

