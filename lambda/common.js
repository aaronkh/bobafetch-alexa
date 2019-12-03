// This file will contain all non-Alexa functions used by other intents
// You should NOT import any Alexa-related modules (ask-*)

const rp = require('request-promise-native')
const url = 'http://35.230.20.197:5000'

exports.YES_INTENTS = {
    LAST_DRINK_CONFIRMATION: 'LAST_DRINK_CONFIRMATION'
}

exports.getISPListByName = async (monetizationService, name, locale) => {
    if(!locale) locale = 'en-US'
    let isps = await monetizationService.getInSkillProducts(locale)
    console.log(typeof isps)
    return isps.filter(item => item.referenceName === name)
}

exports.createDrink = async (tea, sugar, ice) => {
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

exports.getIsPurchasing = async (handlerInput) => {
    let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()
    return persistentAttributes.isPurchasing === true
}