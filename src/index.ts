import * as core from '@actions/core'
import { Options } from './types.d'
import { createComment } from './create-comment'
import { getJunitReport } from './junit'
import { getCoverageReport, getMultipleCoverageReport } from './coverage'
import { getSummaryReport } from './summary'
import { getChangedFiles } from './changed-files'
import { getMultipleReport } from './multi-files'
import { getMultipleJunitReport } from './multi-junit-files'

async function main(): Promise<void> {
  try {
    const token = ''
    const title = 'test'
    const badgeTitle = 'Coverage'
    const hideSummary = true
    const removeLinksToFiles = false
    const removeLinksToLines = false
    const summaryTitle = 'bla'
    const summaryFile = './main/packages/logger/coverage/coverage-summary.json'
    const junitTitle = ''
    const junitFile = ''
    const coverageTitle = 'bla'
    const coverageFile = ''
    const coveragePathPrefix = ''
    const createNewComment = false
    const hideComment = false
    const reportOnlyChangedFiles = false
    const multipleFiles = ['']
    const multipleCoverageFiles = [
      './main/packages/logger/coverage/coverage.txt, ./packages/logger/master-coverage.txt',
    ]
    const multipleJunitFiles = ['']
    const uniqueIdForComment = ''
    const context = {
      /**
       * webhook payload object that triggered the workflow
       */
      payload: {
        after: '',
        pull_request: {
          head: {
            sha: '',
            ref: '',
          },
          base: {
            sha: '',
            ref: '',
          },
        },
      },
      eventName: 'push',
      sha: '',
      repo: {
        repo: '',
        owner: '',
      },
      owner: '',
      ref: 'refs/heads/my_branch',
      workflow: 'github',
      action: 'github_step',
      actor: 'github_step',
      job: 'dump_contexts_to_log',
      runnumber: 1,
      runid: 1,
      apiurl: 'https://api.github.com',
      serverUrl: 'https://github.com',
      graphqlurl: 'https://api.github.com/graphql',
    }
    const serverUrl = context.serverUrl || 'https://github.com'
    core.info(`Uses Github URL: ${serverUrl}`)

    const { repo, owner } = context.repo
    const { eventName, payload } = context
    const watermarkUniqueId = uniqueIdForComment
      ? `| ${uniqueIdForComment} `
      : ''
    const watermark = `<!-- Jest Coverage Comment: ${context.job} ${watermarkUniqueId}-->\n`
    let finalHtml = ''

    const options: Options = {
      token,
      repository: `${owner}/${repo}`,
      serverUrl,
      prefix: `${process.env.GITHUB_WORKSPACE}/`,
      commit: '',
      watermark,
      title,
      badgeTitle,
      summaryFile,
      summaryTitle,
      junitTitle,
      junitFile,
      coverageTitle,
      coverageFile,
      coveragePathPrefix,
      hideSummary,
      removeLinksToFiles,
      removeLinksToLines,
      createNewComment,
      hideComment,
      reportOnlyChangedFiles,
      multipleFiles,
      multipleCoverageFiles,
      multipleJunitFiles,
    }

    if (eventName === 'pull_request' && payload) {
      options.commit = payload.pull_request?.head.sha
      options.head = payload.pull_request?.head.ref
      options.base = payload.pull_request?.base.ref
    } else if (eventName === 'push') {
      options.commit = payload.after
      options.head = context.ref
    }

    if (options.reportOnlyChangedFiles) {
      const changedFiles = await getChangedFiles(options)
      options.changedFiles = changedFiles

      // When GitHub event is different to 'pull_request' or 'push'
      if (!changedFiles) {
        options.reportOnlyChangedFiles = false
      }
    }

    if (!options.hideSummary && options.multipleCoverageFiles === undefined) {
      const report = getSummaryReport(options)
      const { coverage, color, summaryHtml } = report

      if (coverage || summaryHtml) {
        core.startGroup(options.summaryTitle || 'Summary')
        core.info(`coverage: ${coverage}`)
        core.info(`color: ${color}`)
        core.info(`summaryHtml: ${summaryHtml}`)

        core.setOutput('coverage', coverage)
        core.setOutput('color', color)
        core.setOutput('summaryHtml', summaryHtml)
        core.endGroup()
      }

      if (!options.hideSummary) {
        finalHtml += summaryHtml
      }
    }

    if (title) {
      finalHtml += `# ${title}\n\n`
    }

    if (options.junitFile) {
      const junit = await getJunitReport(options)
      const { junitHtml, tests, skipped, failures, errors, time } = junit
      finalHtml += junitHtml ? `\n\n${junitHtml}` : ''

      if (junitHtml) {
        core.startGroup(options.junitTitle || 'Junit')
        core.info(`tests: ${tests}`)
        core.info(`skipped: ${skipped}`)
        core.info(`failures: ${failures}`)
        core.info(`errors: ${errors}`)
        core.info(`time: ${time}`)
        core.info(`junitHtml: ${junitHtml}`)

        core.setOutput('tests', tests)
        core.setOutput('skipped', skipped)
        core.setOutput('failures', failures)
        core.setOutput('errors', errors)
        core.setOutput('time', time)
        core.setOutput('junitHtml', junitHtml)
        core.endGroup()
      }
    }

    core.warning('pre if statement')
    if (options.multipleCoverageFiles) {
      core.warning('in if statement')
      const coverageHtml = getMultipleCoverageReport(options)
      core.warning(String(coverageHtml))
      finalHtml += coverageHtml ? `\n\n${coverageHtml}` : ''
    }

    if (options.coverageFile && !options.multipleCoverageFiles) {
      const coverageReport = getCoverageReport(options)
      const {
        coverageHtml,
        coverage: reportCoverage,
        color: coverageColor,
        branches,
        functions,
        lines,
        statements,
      } = coverageReport
      finalHtml += coverageHtml ? `\n\n${coverageHtml}` : ''

      if (lines || coverageHtml) {
        core.startGroup(options.coverageTitle || 'Coverage')
        core.info(`coverage: ${reportCoverage}`)
        core.info(`color: ${coverageColor}`)
        core.info(`branches: ${branches}`)
        core.info(`functions: ${functions}`)
        core.info(`lines: ${lines}`)
        core.info(`statements: ${statements}`)
        core.info(`coverageHtml: ${coverageHtml}`)

        core.setOutput('coverage', reportCoverage)
        core.setOutput('color', coverageColor)
        core.setOutput('branches', branches)
        core.setOutput('functions', functions)
        core.setOutput('lines', lines)
        core.setOutput('statements', statements)
        core.setOutput('coverageHtml', coverageHtml)
        core.endGroup()
      }
    }

    if (multipleFiles?.length) {
      finalHtml += `\n\n${getMultipleReport(options)}`
    }

    if (multipleJunitFiles?.length) {
      const markdown = await getMultipleJunitReport(options)
      finalHtml += markdown ? `\n\n${markdown}` : ''
    }

    if (!finalHtml || options.hideComment) {
      core.info('Nothing to report')
      return
    }

    const body = watermark + finalHtml
    await createComment(options, body)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

main()
