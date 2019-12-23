// This file will contain all non-Alexa functions used by other intents
// You should NOT import any Alexa-related modules (ask-*)

const rp = require('request-promise-native')
const url = 'http://35.230.20.197:5000'

module.exports.YES_INTENTS = {
    LAST_DRINK_CONFIRMATION: 'LAST_DRINK_CONFIRMATION'
}

module.exports.getISPListByName = async (monetizationService, name, locale) => {
    if(!locale) locale = 'en-US'
    let isps = await monetizationService.getInSkillProducts(locale)
    console.log(isps.inSkillProducts)
    return isps.inSkillProducts.filter(item => item.referenceName === name)
}

module.exports.createDrink = async (tea, sugar, ice) => {
    console.log('create drink called with ' + `${tea} ${sugar} ${ice}`)
    try {
        const body = {
            options: {
                tea: tea,
                sugar: parseInt(sugar),
                ice: parseInt(ice)
            }
        }
        await rp({
            method: 'POST',
            uri: `${url}/queue`,
            body: body,
            json: true
        })
    } catch (e) {
        throw new Error(e)
    }
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