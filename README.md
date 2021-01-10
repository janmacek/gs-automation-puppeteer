## Automation of GS webpage with Puppeteer library (Node.js)
This automation is created for running in GCP Cloud Functions environment.

### Setup:
- First you need `Google Cloud SDK` installed in your computer. Just follow this [tutorial](https://cloud.google.com/sdk/docs/quickstart-debian-ubuntu).
- Then, you need to deploy Cloud Function. To do so, in console open folder where is this repository cloned and then run following: 
```console
gcloud functions deploy gsAutomation --entry-point=runGsAutomation --runtime=nodejs12 --memory=2048MB --timeout=420s --trigger-http
```
- Last thing that needs to be done is to trigger the function repeatetly in time. To do so, first you need to know URL of your Cloud Function and then GCP cloud scheduler can be used. 
To get this URL, run following command: 
##### Substitute $NAME and $PASSWORD in above command with your credentials for GS webpage.
```console 
URI=$(gcloud functions describe gsAutomation | grep url | awk '{print $2}')?loginName=$NAME&loginPwd=$PASSWORD
```
- Enter this command in console to create HTTP trigger to query function every 10 minutes: 
```console
gcloud scheduler jobs create http gs-automation-job --schedule "*/10 * * * * " --uri=$URI --http-method GET
```

#### Setting up is done in Ubuntu 18.04.
