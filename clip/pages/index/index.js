//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
  },
  onLoad: function () {
    tempImg:''
  },
  cancel(){
    this.setData({
      tempImg: ''
    })
  },
  choose(){
    const self = this;
    wx.chooseImage({
      count: 1,
      success: res => {
        self.setData({
          tempImg: res.tempFilePaths[0]
        })
      }
    })
  }
})
