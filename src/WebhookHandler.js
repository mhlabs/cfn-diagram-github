const gh = require('../lib/github');
const jsonUtil = require('@mhlabs/cfn-diagram/resources/JsonUtil');
const YAML = require('yaml-cfn');
const WebhooksApi = require('@octokit/webhooks')
const codeBuildHelper = require("./CodeBuildHelper");
const filenames = [
  'template.yaml',
  'template.yml',
  'template.json',
  'sam.yaml',
  'sam.yml',
  'sam.json',
  'serverless.template'
];
const webhooks = new WebhooksApi.Webhooks({
  secret: process.env.GithubSecret
});

async function handler(request, context, callback) {
  const event = JSON.parse(request.body);
  const verified = webhooks.verify(event, request.headers['x-hub-signature']);
  if (!verified) {
    throw Error("Secret not verified");
  }
  const branch = event.ref.replace('refs/heads/', '');
  console.log(branch);
  for (const commit of event.commits) {
    console.log(commit);
    const repo = commit.url.split('/')[4];
    console.log(repo);
    const templateFile = commit.modified.filter(
      (p) =>
        filenames.filter((f) => {
          console.log(p, f, p.endsWith(f));
          return p.endsWith(f);
        }).length
    );
    if (templateFile.length > 0) {
      const templateStr = await gh.get(templateFile[0], repo);
      const isJson = jsonUtil.isJson();
      const template = isJson
        ? JSON.parse(templateStr)
        : YAML.yamlParse(templateStr);
      await codeBuildHelper.startBuild(repo, branch, templateFile[0]);
    }
  }

  return {
    statusCode: 200
  }
}

module.exports = {
  handler
};
