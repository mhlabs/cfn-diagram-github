const AWS = require('aws-sdk');
const codeBuild = new AWS.CodeBuild();

async function startBuild(repo, branch, templateFile) {
  await codeBuild
    .startBuild({
      sourceAuthOverride: {
        type: 'OAUTH',
        resource: process.env.GithubToken
      },
      sourceTypeOverride: 'GITHUB',
      sourceLocationOverride: `https://github.com/${process.env.GithubOwner}/${repo}`,
      sourceVersion: branch,
      projectName: process.env.CodeBuildProject,
      environmentVariablesOverride: [
        {
          name: 'BUCKET_NAME',
          value: process.env.DiagramBucket
        },
        {
          name: 'STACK_NAME',
          value: repo
        },
        {
          name: 'BRANCH_NAME',
          value: branch
        },
        {
          name: 'TEMPLATE_FILE',
          value: templateFile
        }
      ]
    })
    .promise();
}

module.exports = {
    startBuild
}