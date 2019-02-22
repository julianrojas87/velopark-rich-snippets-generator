const fs = require('fs');
const util = require('util');
const N3 = require('n3');
const request = require('request');

const readFile = util.promisify(fs.readFile);

exports.initUser = username => {
    fs.mkdirSync('./data/' + username);
}


exports.listParkings = async username => {
    if (fs.existsSync('./data/' + username)) {
        let parkings = fs.readdirSync('./data/' + username);
        let tableData = [];

        await Promise.all(parkings.map(async parking => {
            let tdata = {};
            let parkingData = JSON.parse(await readFile('./data/' + username + '/' + parking, 'utf8'));
            tdata['@id'] = decodeURIComponent(parking.substring(0, parking.indexOf('.json')));
            tdata['name'] = parkingData['name'][0]['@value'];
            tableData.push(tdata);
        }));

        return tableData;
    }
}

exports.getListOfTerms = async () => {
    let terms = [];
    let quads = await getTermsRDF();
    let filtered = quads.filter(quad => quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label'
        && quad.subject.value != 'https://velopark.ilabt.imec.be/openvelopark/terms#');

    for (let q in filtered) {
        terms.push({
            '@id': filtered[q].subject.value,
            'label': filtered[q].object.value
        });
    }
    return terms;

}

exports.getParkingTypes = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'http://schema.mobivoc.org/BicycleParkingStation');

    for(let p in filtered) {
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
    }

    return types;
}

exports.getBikeTypes = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#Bicycle');

    for(let p in filtered) {
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
    }

    return types;
}

exports.getFeatures = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#BikeParkingFeature');

    for(let p in filtered) {
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
    }

    return types;
}

async function getTermsRDF() {
    return new Promise((resolve, reject) => {
        request('http://velopark.ilabt.imec.be/openvelopark/terms', (err, res, body) => {
            if (err) {
                reject();
            } else {
                const parser = new N3.Parser();
                resolve(parser.parse(body));
            }
        });
    });
}