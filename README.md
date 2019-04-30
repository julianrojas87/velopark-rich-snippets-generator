# velopark-rich-snippets-generator
HTML form for creating Linked Data descriptions of bike parking facilities

## Installation
First make sure to have [Node](https://nodejs.org/en/) 8.x or superior and [MongoDB](https://docs.mongodb.com/manual/administration/install-community/) installed. To install the server clone this repository and install its dependencies using NPM:
``` bash
$ git clone https://github.com/julianrojas87/velopark-rich-snippets-generator.git
$ cd velopark-rich-snippets-generator
$ npm install
```

## Configuration
The configuration of the application is made through the `config.json` file, present in the root folder. It contains 3 parameters:

- **data:** Path to the folder that will be used to store the generated data. **Is a mandatory parameter**.
- **domain:** Domain name of the application server if configured behind a reverse proxy (e.g. NGINX). It is empty by default.
- **vocabulary:** Open Velopark vocabulary base URI. Default value is https://velopark.ilabt.imec.be. Only needed if using a different distribution of the vocabulary.
- **superAdmins:** Array containing the user emails for the predefined Super Admin accounts.

Next is an example of the configuration:

```json
{
  "data": "/opt/velopark/data",
  "domain": "",
  "vocabulary": "",
  "superAdmins": ["velopark@fietsberaad.be"]
}
```
