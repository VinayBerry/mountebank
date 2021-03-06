'use strict';

const fs = require('fs-extra'),
    run = require('./run').run,
    os = require('os'),
    path = require('path'),
    version = require('./version').getVersion(),
    // parent directory to avoid interaction with project node_modules
    testDir = '../.mb-test-dir';

function bitness () {
    if (os.arch() === 'x64') {
        return 'x64';
    }
    else {
        // avoid "ia32" result on windows
        return 'x86';
    }
}

module.exports = function (grunt) {
    function setExecutableTo (mbPath) {
        process.env.MB_EXECUTABLE = mbPath;
        console.log('Setting MB_EXECUTABLE to ' + mbPath);
    }

    grunt.registerTask('install:tarball', 'Set test executable to mb inside OS-specific tarball', async function (arch) {
        const done = this.async(),
            tarball = `mountebank-v${version}-${os.platform()}-${arch || bitness()}.tar.gz`,
            tarballPath = path.join(testDir, tarball);

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);
        fs.copySync('dist/' + tarball, tarballPath);

        try {
            await run('tar', ['xzf', tarball], { cwd: testDir });
            fs.unlinkSync(tarballPath);
            setExecutableTo(tarballPath.replace('.tar.gz', '') + '/mb');
            done();
        }
        catch (exitCode) {
            grunt.warn('install:tarball failed', exitCode);
        }
    });

    grunt.registerTask('install:zip', 'Set test executable to mb inside Windows zip file', async function (arch) {
        const done = this.async(),
            zipFile = `mountebank-v${version}-win-${arch || bitness()}.zip`,
            zipFilePath = path.resolve('dist', zipFile).replace(/\\/g, '\\\\'),
            testDirPath = path.resolve(testDir).replace(/\\/g, '\\\\'),
            command = `[io.compression.zipfile]::ExtractToDirectory("${zipFilePath}","${testDirPath}")`;

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);

        try {
            await run('powershell', ['-command', 'Add-Type', '-assembly', 'System.IO.Compression.FileSystem;', command]);
            setExecutableTo(path.resolve(testDir, zipFile.replace('.zip', ''), 'mb.cmd'));
            done();
        }
        catch (exitCode) {
            grunt.warn('install:zip failed', exitCode);
        }
    });

    grunt.registerTask('install:npm', 'Set test executable to mb installed through local npm from tarball', async function () {
        const done = this.async(),
            tarball = `mountebank-v${version}-npm.tar.gz`;

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);
        fs.copySync('dist/' + tarball, path.join(testDir, tarball));

        try {
            await run('npm', ['install', './' + tarball], { cwd: testDir });
            setExecutableTo(testDir + '/node_modules/.bin/mb');
            done();
        }
        catch (exitCode) {
            grunt.warn('install:npm failed', exitCode);
        }
    });

    grunt.registerTask('install:pkg', 'Set test executable to mb installed in OSX pkg file', async function () {
        const done = this.async(),
            pkg = `mountebank-v${version}.pkg`;

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);
        fs.copySync('dist/' + pkg, path.join(testDir, pkg));

        try {
            await run('sudo', ['installer', '-pkg', pkg, '-target', '/'], { cwd: testDir });
            setExecutableTo('mb');
            done();
        }
        catch (exitCode) {
            grunt.warn('install:pkg failed', exitCode);
        }
    });

    grunt.registerTask('install:deb', 'Set test executable to mb installed in Debian file', async function () {
        const done = this.async(),
            deb = `mountebank_${version}_amd64.deb`;

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);
        fs.copySync('dist/' + deb, path.join(testDir, deb));

        try {
            await run('sudo', ['dpkg', '-i', deb], { cwd: testDir });
            setExecutableTo('mb');
            done();
        }
        catch (exitCode) {
            grunt.warn('install:deb failed', exitCode);
        }
    });

    grunt.registerTask('uninstall:deb', 'Verify uninstallation of Debian file', async function () {
        const done = this.async();

        try {
            await run('sudo', ['dpkg', '-r', 'mountebank'], { cwd: testDir });
            if (fs.existsSync('/usr/local/bin/mb')) {
                throw new Error('Uninstalling debian package did not remove /usr/local/bin/mb');
            }
            done();
        }
        catch (exitCode) {
            grunt.warn('uninstall:deb failed', exitCode);
        }
    });

    grunt.registerTask('install:rpm', 'Set test executable to mb installed in Red Hat package', async function () {
        const done = this.async(),
            rpm = `mountebank-${version.replace('-', '_')}-1.x86_64.rpm`;

        fs.removeSync(testDir);
        fs.mkdirSync(testDir);
        fs.copySync('dist/' + rpm, path.join(testDir, rpm));

        try {
            await run('sudo', ['yum', '-y', '--nogpgcheck', 'localinstall', rpm], { cwd: testDir });
            setExecutableTo('mb');
            done();
        }
        catch (exitCode) {
            grunt.warn('install:rpm failed', exitCode);
        }
    });

    grunt.registerTask('uninstall:rpm', 'Verify uninstallation of Red Hat package', async function () {
        const done = this.async();

        try {
            await run('sudo', ['yum', 'remove', 'mountebank'], { cwd: testDir });
            if (fs.existsSync('/usr/local/bin/mb')) {
                throw new Error('Uninstalling Red Hat package did not remove /usr/local/bin/mb');
            }
            done();
        }
        catch (exitCode) {
            grunt.warn('uninstall:rpm failed', exitCode);
        }
    });
};
