import fse from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';

const log = console.log;
const DEFAULT_OPT = {
  headers: {
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'zh-CN,zh;q=0.9',
    pragma: 'no-cache',
    'cache-control': 'no-cache',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
  }
};

class Download {
  private inputPath = '';
  private outputPath = '';

  private configContent: string = '';

  private dyUrls: string[] = [];

  private videoUrls: string[] = [];

  constructor() {
    this.inputPath = '../config/urls.txt';
    this.outputPath = '../videos';
  }

  // 启动引擎
  public async start() {
    await this.loadConfig();
    this.getUrlsByFormaterConfig();
    await this.getVideosByUrls();
    this.downloadVideos();
  }

  // 加载配置
  private async loadConfig() {
    return new Promise(resolve => {
      const filePath = path.join(__dirname, this.inputPath);
      log(filePath);
      if (fse.existsSync(filePath)) {
        const read = fse.createReadStream(filePath, {
          encoding: 'utf-8'
        });

        let content = '';
        read.on('data', data => {
          content += data;
        });

        read.on('end', () => {
          log('文件读取结束');
          this.configContent = content;
          resolve();
        });
      }
    });
  }

  // 格式化得到Url
  private getUrlsByFormaterConfig() {
    const splitRule = '\n';
    const matchReg = /https:\/\/.+(?= )/;
    this.dyUrls = this.configContent
      .split(splitRule)
      .map(str => {
        const matchs = str.match(matchReg);
        return matchs ? matchs[0] : '';
      })
      .filter(str => !!str);
  }

  // 根据Url请求mp4
  private async getVideosByUrls() {
    const respArr: any[] = await Promise.all(
      this.dyUrls.map(url => fetch(url).then(res => res.text()))
    );

    if (Array.isArray(respArr) && respArr.length > 0) {
      this.videoUrls = respArr
        .map(resp =>
          resp
            ? resp
                .match(/playAddr:\s*"(.+)"/)[1]
                .replace(/\/playwm\//, '/play/')
            : ''
        )
        .filter(str => !!str);
    }
  }

  // 将mp4下载
  private async downloadVideos() {
    await Promise.all(
      this.videoUrls.map((url, index) =>
        fetch(url, DEFAULT_OPT).then(res => {
          const destFile = path.join(
            __dirname,
            this.outputPath,
            `video_${index}.mp4`
          );
          const dest = fse.createWriteStream(destFile);
          res.body.pipe(dest);
        })
      )
    );
    log('下载完成');
  }
}

export default new Download();
