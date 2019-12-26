// This file will contain all non-Alexa functions used by other intents
// You should NOT import any Alexa-related modules (ask-*)
const Https = require('https');

module.exports.YES_INTENTS = {
    LAST_DRINK_CONFIRMATION: 'LAST_DRINK_CONFIRMATION'
}

module.exports.joinWithAnd = (arr) => {
    if(arr.length == 0) return ''
    let res = ''
    for(let i = 0; i < arr.length - 1; i++) {
        res += arr[i] + ', '
    }
    res += 'and ' + arr[arr.length - 1]
    return res
}

// @source https://www.hackster.io/alexagadgets/lego-mindstorms-voice-challenge-setup-17300f
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

// @source https://www.hackster.io/alexagadgets/lego-mindstorms-voice-challenge-setup-17300f
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

// gets all items that can be bought as an In-skill purchase
module.exports.getISPListByName = async (monetizationService, name, locale) => {
    if(!locale) locale = 'en-US'
    let isps = await monetizationService.getInSkillProducts(locale)
    console.log(isps.inSkillProducts)
    return isps.inSkillProducts.filter(item => item.referenceName === name)
}

// true if purchasing is set to on
module.exports.getIsPurchasing = async (handlerInput) => {
    let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()
    return persistentAttributes.isPurchasing === true
}

// getting the queue...
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