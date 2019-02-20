const fs = require('fs');
const util = require('util');

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
    } else {
        return [];
    }
}