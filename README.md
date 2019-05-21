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
The configuration of the application is made through the `config.json` file and the `config_secret.json` file, present in the root folder. 

### `config.json` 
Contains 4 parameters:
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

### `config_secret.json`
Also contains 4 parameters:
- **NL_EMAIL_HOST:** The server that handles sending emails.
- **NL_EMAIL_USER:** The username to connect to the email server with.
- **NL_EMAIL_PASS:** The password that matches the username to connect to the email server.
- **tokenSecret:** A random 64 char string used as server token to sign password reset tokens with.

Example:

```json
{
"NL_EMAIL_HOST": "smtp.gmail.com",
"NL_EMAIL_USER": "my.email@gmail.com",
"NL_EMAIL_PASS": "password",
"tokenSecret": "**..."
}
```
