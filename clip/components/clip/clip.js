// components/clip/clip.js
import regeneratorRuntime from '../../lib/regenerator.runtime.min';
import { debounce } from '../../lib/dispatch';
import * as Q from '../../lib/q.min';
const app = getApp();
let self;

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    imgSrc: {
      type: String,
    },
    // 裁剪框宽度
    clipW: {
      type: Number
    },
    // 裁剪框高度
    clipH: {
      type: Number
    }
  },
  data: {
    x: '', // movable-view x偏移量
    y: '', // movable-view y偏移量
    IMG_W: '', // 图片原始宽度
    IMG_H: '', // 图片原始高度
    cropperW: '', // 初始化后图片宽度
    cropperH: '', // 初始化后图片高度
    scale: 1, // 放大比例
    left: '', // 图片距离左边距离
    top: '', // 图片距离顶部距离
    ratio: '', //设备像素比
  },
  ready() {
    self = this;
    self.init();
  },
  methods: {
    // 下载文件
    download(img) {
      const deferred = Q.defer();
      wx.downloadFile({
        url: img,
        success: res => {
          deferred.resolve(res.tempFilePath);
        },
        fail: err => {
          deferred.reject(err);
        }
      })
      return deferred.promise;
    },
    // 获取设备信息
    getDevice() {
      const deferred = Q.defer();
      wx.getSystemInfo({
        success: res => {
          deferred.resolve(res);
        },
        fail: err => {
          deferred.reject(err);
        }
      })
      return deferred.promise;
    },
    getImageInfo() {
      const deferred = Q.defer();
      wx.getImageInfo({
        src: this.data.imgSrc,
        success: res => {
          deferred.resolve(res);
        },
        fali: err => {
          deferred.reject(err);
        }
      })
      return deferred.promise;
    },
    // 拖拽事件
    move: debounce(({ detail }) => {
      self.setData({
        left: detail.x * self.data.ratio,
        top: detail.y * self.data.ratio,
      })
    }, 500),
    // 缩放事件
    scale: debounce(({ detail }) => {
      self.setData({
        left: detail.x * self.data.ratio,
        top: detail.y * self.data.ratio,
        scale: detail.scale
      })
    }, 500),
    async init() {
      try {
        const { clipW, clipH } = this.data;
        const img = await this.getImageInfo();
        const device = await this.getDevice();
        const { width, height } = img;
        this.data.IMG_W = width;
        this.data.IMG_H = height;
        const imgRatio = width / height; // 图片宽高比
        this.data.ratio = 750 / device.windowWidth; // 设备像素比
        switch (true) {
          case imgRatio >= 1 && (clipW / imgRatio >= clipH):
          case imgRatio < 1 && (clipH * imgRatio < clipW):
            this.setData({
              cropperW: clipW,
              cropperH: clipW / imgRatio,
              x: 0,
              y: -(clipW / imgRatio - clipH) / (750 / device.windowWidth) / 2,
              left: 0,
              top: -(clipW / imgRatio - clipH) / (750 / device.windowWidth) / 2
            })
            break;
          case imgRatio >= 1 && (clipW / imgRatio < clipH):
          case imgRatio < 1 && (clipH * imgRatio >= clipW):
            this.setData({
              cropperW: clipH * imgRatio,
              cropperH: clipH,
              y: 0,
              x: -(clipH * imgRatio - clipW) / (750 / device.windowWidth) / 2,
              left: -(clipH * imgRatio - clipW) / (750 / device.windowWidth) / 2,
              top: 0
            })
            break;
        }
      } catch (error) {
        console.log(error, '图片初始化失败')
      }
    },
    // 取消
    cancel() {
      this.triggerEvent('cancel');
    },
    //生成图片
    async save() {
      app.showLoading('图片生成中...');
      const {
        left,
        top,
        cropperW,
        cropperH,
        scale,
        IMG_W,
        IMG_H,
        ratio,
        imgSrc,
        clipW,
        clipH
      } = this.data;
      const canvasL = -(left / (cropperW * scale)) * IMG_W; // 截图时矩形框左上角x坐标
      const canvasT = -(top / (cropperH * scale)) * IMG_H; // 截图时矩形框左上角y坐标
      const canvasW = (clipW / (cropperW * scale)) * IMG_W; //实际绘制图像宽度 缩放
      const canvasH = (clipH / (cropperH * scale)) * IMG_H; //实际绘制图像高度 缩放
      const ctx = wx.createCanvasContext('clip', self);
      ctx.save();
      ctx.beginPath();
      ctx.clearRect(0, 0, 1000, 1000);
      ctx.rect(0, 0, clipW / ratio, clipH / ratio);
      ctx.clip();
      ctx.drawImage(imgSrc, canvasL, canvasT, canvasW, canvasH, 0, 0, clipW / ratio, clipH / ratio);
      ctx.restore();
      ctx.draw(true, () => {
        wx.canvasToTempFilePath({
          x: 0,
          y: 0,
          width: clipW / ratio,
          height: clipH / ratio,
          destWidth: clipW,
          destHeight: clipH,
          canvasId: 'clip',
          success: res => {
            wx.hideLoading();
            wx.previewImage({
              urls: [res.tempFilePath]
            })
          },
          fail: err => {
            app.showToast('网络错误,请稍后再试')
          }
        }, self)
      })
    }
  }
})
