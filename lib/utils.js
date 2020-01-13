const { parse } = require('url')
const http = require('follow-redirects').https
const fs = require('fs-extra');
const path = require('path')

const TIMEOUT = 10000

class Utils {
    static async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async download(url, outputDir, name, force = false) {
        if (! await fs.exists(path.join(outputDir, name)) || force) {

            await fs.ensureDir(outputDir);
            const file = fs.createWriteStream(path.join(outputDir, name));
            const uri = parse(url)

            return new Promise(function (resolve, reject) {
                const request = http.get(uri.href).on('response', function (res) {
                    const len = parseInt(res.headers['content-length'], 10)
                    let downloaded = 0
                    let percent = 0
                    res
                        .on('data', function (chunk) {
                            file.write(chunk)
                            downloaded += chunk.length
                            percent = (100.0 * downloaded / len).toFixed(2)
                            process.stdout.write(`Downloading ${percent}% ${downloaded} bytes\r`)
                        })
                        .on('end', function () {
                            file.end()
                            console.log(`${uri.path} downloaded to: ${outputDir}`)
                            resolve()
                        })
                        .on('error', function (err) {
                            reject(err)
                        })
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