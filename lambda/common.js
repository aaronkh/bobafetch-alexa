// This file will contain all non-Alexa functions used by other intents
// You should NOT import any Alexa-related modules (ask-*)
const Https = require('https');

const rp = require('request-promise-native')
const url = 'http://35.230.20.197:5000'

module.exports.YES_INTENTS = {
    LAST_DRINK_CONFIRMATION: 'LAST_DRINK_CONFIRMATION'
}

module.exports.getConnectedEndpoints = function(apiEndpoint, apiAccessToken) {

    // The preceding https:// need to be stripped off before making the call
    apiEndpoint = (apiEndpoint || '').replace('https://', '');

    return new Promise(((resolve, reject) => {

        const options = {
            host: apiEndpoint,
            path: '/v1/endpoints',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiAccessToken
            }
        };

        const request = Https.request(options, (response) => {
            response.setEncoding('utf8');
            let returnData = '';
            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    }));
};

module.exports.getISPListByName = async (monetizationService, name, locale) => {
    if(!locale) locale = 'en-US'
    let isps = await monetizationService.getInSkillProducts(locale)
    console.log(isps.inSkillProducts)
    return isps.inSkillProducts.filter(item => item.referenceName === name)
}

exports.build = function (endpointId, namespace, name, payload) {
    // Construct the custom directive that needs to be sent
    // Gadget should declare the capabilities in the discovery response to
    // receive the directives under the following namespace.
    return {
        type: 'CustomInterfaceController.SendDirective',
        header: {
            name: name,
            namespace: namespace
        },
        endpoint: {
            endpointId: endpointId
        },
        payload
    };
}

module.exports.getIsPurchasing = async (handlerInput) => {
    let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()
    return persistentAttributes.isPurchasing === true
}

module.exports.getQueue = async (handlerInput) => {
    return await handlerInput.attributesManager.getPersistentAttributes().queue
}

module.exports.enqueue = async (handlerInput, obj) => {
    let pa = await handlerInput.attributesManager.getPersistentAttributes()
    let q = pa.queue
    q.push(obj)
    pa.queue = q
    handlerInput.attributesManager.setPersistentAttributes(pa)
    handlerInput.attributesManager.savePersistentAttributes()
}

module.exports.dequeue = async (handlerInput) => {
    let pa = await handlerInput.attributesManager.getPersistentAttributes()
    let q = pa.queue
    await q.shift() // this may take a long time 
    pa.queue = q
    handlerInput.attributesManager.setPersistentAttributes(pa)
    handlerInput.attributesManager.savePersistentAttributes()
}

module.exports.clearQueue = async (handlerInput) => {
    let pa = await handlerInput.attributesManager.getPersistentAttributes()
    pa.queue = []
    handlerInput.attributesManager.setPersistentAttributes(pa)
    handlerInput.attributesManager.savePersistentAttributes()
}