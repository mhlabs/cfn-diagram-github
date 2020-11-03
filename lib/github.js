const { Octokit } = require('@octokit/rest');
const ORGANIZATION = process.env.GithubOwner;

async function get(file, repo) {
  const octo = new Octokit({
    auth: process.env.GithubToken
  });
  console.log(repo, file);
  const content = await octo.repos.getContent({
    owner: ORGANIZATION,
    repo: repo,
    path: file
  });
  let buff = Buffer.from(content.data.content, 'base64');
  let text = buff.toString('ascii');

  return text;
}

// Code inspired by https://dev.to/lucis/how-to-push-files-programatically-to-a-repository-using-octokit-with-typescript-1nj0
async function push(file, branch, repo, content, commitMessage) {
  const octo = new Octokit({
    auth: process.env.GithubToken
  });
  // gets commit's AND its tree's SHA
  console.log(repo, branch);
  const currentCommit = await getCurrentCommit(octo, repo, branch);
  const filesBlobs = await Promise.all([createBlob(octo, repo, content)]);
  const pathsForBlobs = [file];
  const newTree = await createNewTree(
    octo,
    repo,
    filesBlobs,
    pathsForBlobs,
    currentCommit.treeSha
  );
  const newCommit = await createNewCommit(
    octo,
    repo,
    commitMessage,
    newTree.sha,
    currentCommit.commitSha
  );
  await setBranchToCommit(octo, repo, branch, newCommit.sha);
}

const getCurrentCommit = async (octo, repo, branch) => {
  const { data: refData } = await octo.git.getRef({
    owner: ORGANIZATION,
    repo: repo,
    ref: `heads/${branch}`
  });
  const commitSha = refData.object.sha;
  const { data: commitData } = await octo.git.getCommit({
    owner: ORGANIZATION,
    repo: repo,
    commit_sha: commitSha
  });
  return {
    commitSha,
    treeSha: commitData.tree.sha
  };
};

const createBlob = async (octo, repo, content) => {
  const blobData = await octo.git.createBlob({
    owner: ORGANIZATION,
    repo: repo,
    content,
    encoding: 'utf-8'
  });
  return blobData.data;
};

const createNewTree = async (octo, repo, blobs, paths, parentTreeSha) => {
  const tree = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644`,
    type: `blob`,
    sha
  }));
  const { data } = await octo.git.createTree({
    owner: ORGANIZATION,
    repo: repo,
    tree,
    base_tree: parentTreeSha
  });
  return data;
};

const createNewCommit = async (
  octo,
  repo,
  message,
  currentTreeSha,
  currentCommitSha
) =>
  (
    await octo.git.createCommit({
      owner: ORGANIZATION,
      repo: repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha]
    })
  ).data;

const setBranchToCommit = async (octo, repo, branch, commitSha) =>
  await octo.git.updateRef({
    owner: ORGANIZATION,
    repo: repo,
    ref: `heads/${branch}`,
    sha: commitSha
  });

module.exports = {
  push,
  get
};
