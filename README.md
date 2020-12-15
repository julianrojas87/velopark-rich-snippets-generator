# velopark-rich-snippets-generator
Web application for creating Linked Data-based bicycle parking descriptions using the [Open Velopark Vocabulary](https://velopark.ilabt.imec.be/openvelopark/vocabulary).

## Deploy with Docker

We use `docker` and `docker-compose` to deploy the application, following these steps:

1. Download the existing parkings (`velopark.tar.gz` file) from [here](https://cloud.ilabt.imec.be/index.php/s/MNLtEc5jMXx3C9f).
2. Replace `/home/julian/data/velopark` [here](https://github.com/julianrojas87/velopark-rich-snippets-generator/blob/0e53a13d878249f83a219afd055067a029049783/docker-compose.yml#L9), for the path of the downloaded folder in the previous step.
3. Configure the environment variables in the [`docker-compose.yml`](https://github.com/julianrojas87/velopark-rich-snippets-generator/blob/master/docker-compose.yml) file. An example can be seen in the `environment.md` file [here](https://cloud.ilabt.imec.be/index.php/s/MNLtEc5jMXx3C9f). Make sure to have first a running instance of [`velopark-db`](https://github.com/julianrojas87/velopark-db/) somewhere.
4. Deploy it running `docker-compose up`.