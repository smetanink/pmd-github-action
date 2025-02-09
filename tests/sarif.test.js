const path = require('path');
const sarif = require('../lib/sarif');
const io = require('@actions/io');
const os = require('os');

const tempPath = path.join(__dirname, 'TEMP');

describe('pmd-github-action-sarif', function () {

  beforeEach(async function () {
    await io.rmRF(tempPath);
    await io.mkdirP(tempPath);
  })

  afterEach(function () {
    delete process.env['GITHUB_WORKSPACE'];
  })

  afterAll(async function () {
    await io.rmRF(tempPath);
  })

  it('can count violations', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report.sarif'));
    expect(count).toBe(1);
  })

  it('can deal with empty report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-empty.sarif'));
    expect(count).toBe(0);
  })

  it('can deal with no report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-not-existing.sarif'));
    expect(count).toBe(0);
  })

  it('can load report', () => {
    const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report.sarif'));
    expect(report).not.toBe(null);
    expect(report.runs[0].tool.driver.name).toBe('PMD');
  })

  it('can deal with missing report', () => {
    const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report-not-existing.sarif'));
    expect(report).toBe(null);
  })

  test('relativize can deal with missing report', () => {
    const reportPath = path.join(__dirname, 'data', 'pmd-report-not-existing.sarif');
    sarif.relativizeReport(reportPath);
  })

  test('can properly relativize report', async () => {
    const isWindows = os.platform() === 'win32';

    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', isWindows ? 'pmd-report-win.sarif' : 'pmd-report.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    const fullPath = isWindows ? 'D:\\a\\pmd-github-action-test\\src\\classes\\UnusedLocalVariableSample.cls' : '/home/andreas/PMD/source/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls';
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(fullPath);

    process.env['GITHUB_WORKSPACE'] = isWindows ? 'D:\\a\\pmd-github-action-test' : '/home/andreas/PMD/source/pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    expect(path.normalize(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri))
      .toBe(path.normalize('src/classes/UnusedLocalVariableSample.cls'));
  })

  test('can properly relativize already relativized report', async () => {
    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-relativized.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/classes/UnusedLocalVariableSample.cls');

    process.env['GITHUB_WORKSPACE'] = '/home/andreas/PMD/source/pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/classes/UnusedLocalVariableSample.cls');
  })
});
