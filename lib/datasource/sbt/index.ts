import { compare } from '../../versioning/maven/compare';
import { downloadHttpProtocol } from '../maven/util';
import { parseIndexDir, SBT_PLUGINS_REPO } from './util';
import { logger } from '../../logger';
import { PkgReleaseConfig, ReleaseResult } from '../common';
import { DEP_TYPE_PLUGIN } from '../../constants/dependency';

const ensureTrailingSlash = (str: string): string => str.replace(/\/?$/, '/');

async function resolvePackageReleases(
  searchRoot: string,
  artifact: string,
  scalaVersion: string
): Promise<string[]> {
  const indexContent = await downloadHttpProtocol(
    ensureTrailingSlash(searchRoot),
    'sbt'
  );
  if (indexContent) {
    const releases: string[] = [];
    const parseSubdirs = (content: string): string[] =>
      parseIndexDir(content, x => {
        if (x === artifact) return true;
        if (x.indexOf(`${artifact}_native`) === 0) return false;
        if (x.indexOf(`${artifact}_sjs`) === 0) return false;
        return x.indexOf(`${artifact}_`) === 0;
      });
    const artifactSubdirs = parseSubdirs(indexContent);
    let searchSubdirs = artifactSubdirs;
    if (
      scalaVersion &&
      artifactSubdirs.indexOf(`${artifact}_${scalaVersion}`) !== -1
    ) {
      searchSubdirs = [`${artifact}_${scalaVersion}`];
    }
    const parseReleases = (content: string): string[] =>
      parseIndexDir(content, x => !/^\.+$/.test(x));
    for (const searchSubdir of searchSubdirs) {
      const content = await downloadHttpProtocol(
        ensureTrailingSlash(`${searchRoot}/${searchSubdir}`),
        'sbt'
      );
      if (content) {
        const subdirReleases = parseReleases(content);
        subdirReleases.forEach(x => releases.push(x));
      }
    }
    if (releases.length) return [...new Set(releases)].sort(compare);
  }

  return null;
}

async function resolvePluginReleases(
  rootUrl: string,
  artifact: string,
  scalaVersion: string
): Promise<string[]> {
  const searchRoot = `${rootUrl}/${artifact}`;
  const parse = (content: string): string[] =>
    parseIndexDir(content, x => !/^\.+$/.test(x));
  const indexContent = await downloadHttpProtocol(
    ensureTrailingSlash(searchRoot),
    'sbt'
  );
  if (indexContent) {
    const releases: string[] = [];
    const scalaVersionItems = parse(indexContent);
    const scalaVersions = scalaVersionItems.map(x => x.replace(/^scala_/, ''));
    const searchVersions =
      scalaVersions.indexOf(scalaVersion) === -1
        ? scalaVersions
        : [scalaVersion];
    for (const searchVersion of searchVersions) {
      const searchSubRoot = `${searchRoot}/scala_${searchVersion}`;
      const subRootContent = await downloadHttpProtocol(
        ensureTrailingSlash(searchSubRoot),
        'sbt'
      );
      if (subRootContent) {
        const sbtVersionItems = parse(subRootContent);
        for (const sbtItem of sbtVersionItems) {
          const releasesRoot = `${searchSubRoot}/${sbtItem}`;
          const releasesIndexContent = await downloadHttpProtocol(
            ensureTrailingSlash(releasesRoot),
            'sbt'
          );
          if (releasesIndexContent) {
            const releasesParsed = parse(releasesIndexContent);
            releasesParsed.forEach(x => releases.push(x));
          }
        }
      }
    }
    if (releases.length) return [...new Set(releases)].sort(compare);
  }
  return resolvePackageReleases(rootUrl, artifact, scalaVersion);
}

export async function getPkgReleases(
  config: PkgReleaseConfig
): Promise<ReleaseResult | null> {
  const { lookupName, depType } = config;

  const registryUrls =
    depType === DEP_TYPE_PLUGIN
      ? [SBT_PLUGINS_REPO, ...config.registryUrls]
      : config.registryUrls;

  const [groupId, artifactId] = lookupName.split(':');
  const groupIdSplit = groupId.split('.');
  const artifactIdSplit = artifactId.split('_');
  const [artifact, scalaVersion] = artifactIdSplit;

  const repoRoots = registryUrls.map(x => x.replace(/\/?$/, ''));
  const searchRoots: string[] = [];
  repoRoots.forEach(repoRoot => {
    // Optimize lookup order
    if (depType === DEP_TYPE_PLUGIN) {
      searchRoots.push(`${repoRoot}/${groupIdSplit.join('.')}`);
      searchRoots.push(`${repoRoot}/${groupIdSplit.join('/')}`);
    } else {
      searchRoots.push(`${repoRoot}/${groupIdSplit.join('/')}`);
      searchRoots.push(`${repoRoot}/${groupIdSplit.join('.')}`);
    }
  });

  for (let idx = 0; idx < searchRoots.length; idx += 1) {
    const searchRoot = searchRoots[idx];
    const versions =
      depType === DEP_TYPE_PLUGIN
        ? await resolvePluginReleases(searchRoot, artifact, scalaVersion)
        : await resolvePackageReleases(searchRoot, artifact, scalaVersion);

    const dependencyUrl =
      depType === DEP_TYPE_PLUGIN ? `${searchRoot}/${artifact}` : searchRoot;

    if (versions) {
      return {
        display: lookupName,
        group: groupId,
        name: artifactId,
        dependencyUrl,
        releases: versions.map(v => ({ version: v })),
      };
    }
  }

  logger.info(
    `No versions found for ${lookupName} in ${searchRoots.length} repositories`
  );
  return null;
}
