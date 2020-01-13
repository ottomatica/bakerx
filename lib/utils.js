const { parse } = require('url')
const http = require('follow-redirects').https
//const request = require('request');
//const progress = require('request-progress');

const fs = require('fs-extra');
const path = require('path')

const TIMEOUT = 10000

class Utils {
    static async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async download(url, outputDir, name, force = false) {
        let destPath = path.join(outputDir, name);
        if (! await fs.exists(destPath) || force) {

            await fs.ensureDir(outputDir);
            if (force) await fs.remove(destPath);
            const uri = parse(url)

            return new Promise(function (resolve, reject) {
                const request = http.get(uri.href).on('response', function (res) {
                    if (res.statusCode == 200) {
                        const len = parseInt(res.headers['content-length'], 10)
                        let downloaded = 0
                        let percent = 0
                        res
                            .on('data', function (chunk) {
                                downloaded += chunk.length
                                percent = (100.0 * downloaded / len).toFixed(2)
                                process.stdout.write(`Downloading ${percent}% ${downloaded} bytes\r`)
                            })
                            .on('end', function () {
                                console.log(`${uri.path} downloaded to: ${outputDir}`)
                                resolve()
                            })
                            .on('error', function (err) {
                                reject(err)
                            })
                            .pipe(fs.createWriteStream(destPath));
                    } else {
                        if (res.statusCode == 404) console.log(`${name} does not exist, skipping...`);
                        resolve();
                    }
                })
                request.setTimeout(TIMEOUT, function () {
                    request.abort()
                    reject(new Error(`request timeout after ${TIMEOUT / 1000.0}s`))
                })
            })
        }
    }
}

module.exports = Utils;