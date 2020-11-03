const AWS = require('aws-sdk');
const github = require('../lib/github');
const CodeBuildHelper = require('./CodeBuildHelper');
const s3 = new AWS.S3();
const filenames = [
  'template.yaml',
  'template.yml',
  'template.json',
  'sam.yaml',
  'sam.yml',
  'sam.json',
  'serverless.template'
];

exports.handler = async function (event, context) {
  const stack = event.queryStringParameters.repo;
  let branch = event.queryStringParameters.branch;
  const key = `${stack}/${branch}/cfn-diagram.png`;
  let diagram;

  try {
    if (branch === 'coalesce') {
      for (const branchName of ['master', 'main', 'develop']) {
        try {
            branch = branchName;
            diagram = await s3
            .getObject({
              Bucket: process.env.DiagramBucket,
              Key: key.replace('/coalesce/', `/${branchName}/`)
            })
            .promise();
            console.log("found it")
        } catch (err) {
            console.log(`No diagram for ${branchName}`);
        }
      }
      if (!diagram) {
          throw new Error("no diagram");
      }
    } else {
      diagram = await s3
        .getObject({ Bucket: process.env.DiagramBucket, Key: key })
        .promise();
    }
    console.log(diagram);
  } catch {
    await s3
      .putObject({
        Bucket: process.env.DiagramBucket,
        Key: key.replace('/coalesce/', `/${branch}/`),
        Body: 'placeholder'
      })
      .promise();
    const mhPath = `${stack.replace(/-/g, '_')}/`;
    console.log(mhPath);
    for (const filename of filenames) {
      for (const basePath of ['', mhPath]) {
        console.log('path', basePath + filename);
        try {
          const file = await github.get(basePath + filename, stack);
          if (file.includes('AWSTemplateFormatVersion')) {
            await CodeBuildHelper.startBuild(
              stack,
              branch,
              basePath + filename
            );
            return;
          }
        } catch (err) {
          console.log(err.message);
        }
      }
    }
    return;
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png;base64',
      'Cache-Control': 'no-cache'
    },
    body: diagram.Body.toString('base64'),
    isBase64Encoded: true
  };
};
