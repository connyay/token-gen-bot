'use strict';

var request = require('request');
var Q = require('q');
var fs = require('fs');
var config = require('./config');

var tokens = {};
if (!config) {
    config = {};
}
if(!config.domains) {
    config.domains = process.env.AUTH_DOMAINS.split(',');
}
config.domains.forEach(function(domain) {
    config[domain] = {
        auth: process.env[domain + '_AUTH'],
        id: process.env[domain + '_ID']
    };
});

// Trump the config file with our findings.
fs.writeFileSync('./config.json', JSON.stringify(config, null, 4));

function generateToken(domain) {
    var deferred = Q.defer();
    var scope = encodeURIComponent('domain/' + config[domain].id + '/admin');
    var options = {
        url: 'https://' + config.host + '/broker/rest/user/authorizations?scope=' + scope + '&reuse=true',
        method: 'POST',
        strictSSL: false,
        headers: {
            'Accept': '*/*',
            'Authorization': 'Basic ' + config[domain].auth
        }
    };
    request(options, function(error, response, body) {
        if (error) throw error;
        var token;
        if (response.statusCode === 200 || response.statusCode === 201) {
            try {
                token = JSON.parse(body).data.token;
            } catch (e) {
                console.log('We failed ', e);
            }
            if (token) {
                tokens[domain] = token;
            }
        }
        deferred.resolve();
    });
    return deferred.promise;
}


var deferredList = [];
config.domains.forEach(function(domain) {
    deferredList.push(generateToken(domain));
});

Q.all(deferredList).then(function() {
    if(tokens && !config.posturl) {
        console.log('have tokens, but not sure what to do with them...');
        process.exit(1);
    }
    var options = {
        url: config.posturl,
        method: 'POST',
        json: true,
        body: tokens,
        strictSSL: false,
        headers: {
            'Accept': 'application/json'
        }
    };
    request(options, function(error, response) {
        if(error) {
            console.log('Errored on token post');
        }
        console.log(response.body);
        process.exit(0);
    });
});
