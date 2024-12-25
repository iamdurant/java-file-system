# java-file-system
java文件管理系统，一站式地管理自己的各种资源：图片、视频、压缩包、文档、音乐等等。

### 技术栈
- spring-boot
- redis
- minio

### 功能
- 文件上传，下载
- 支持文件夹，文件夹的创建与删除
- 预览视频
- 预览图片
- 预览文本
- markdown预览
- 文件搜索
- 微型音频播放器

### 效果
#### 移动端
|   ![image-20241225232100022](https://github.com/user-attachments/assets/98863fac-08e8-4575-ba94-8122ecc6de22)  |   ![image-20241225232144079](https://github.com/user-attachments/assets/6627195c-d809-4d05-9a52-5f3a4eba81b7)   |   ![image-20241225232220092](https://github.com/user-attachments/assets/00078456-563d-4277-b246-f76be82c8710)   |
| ---- | ---- | ---- |

#### 

#### pc端
| ![image](https://github.com/user-attachments/assets/3e3d80d5-8dc9-49a6-b3b9-e7f902aa2553) | ![image](https://github.com/user-attachments/assets/07219605-5e29-4504-a6c4-551a86f306f8) | ![image](https://github.com/user-attachments/assets/dc9ca1b0-1118-4c4f-9756-ca40f119e8c4) |
| ---- | ---- | ---- |
| ![image](https://github.com/user-attachments/assets/442864ac-cac0-43c0-9178-7e8ca8cddfa8) | ![image](https://github.com/user-attachments/assets/3566c46c-7da3-44c0-a000-104fcbdac968) | ![image](https://github.com/user-attachments/assets/fc92b218-e246-4498-8442-e99ca3a36281) |


### 配置
1. 部署minio(linux)
```shell
# 根据cpu架构选取合适版本
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
MINIO_ROOT_USER=wwb MINIO_ROOT_PASSWORD=pubgM666 ./minio server /mnt/min_data --console-address ":9001"

# 访问后台配置access-key，secret-key，9001端口
```
3. 部署redis(linux)
4. 配置application.yml
```yml
spring:
  servlet:
    # 上传大小匹配
    multipart:
      max-file-size: 1TB
      max-request-size: 1TB
  # redis 配置
  redis:
    host: 192.168.1.101
    password: pubgM666
    port: 6379
    database: 2

# minio 配置
minio:
  endpoint: http://192.168.1.101:9000
  access-key: BdsOyQdaT1cMM6lojeoC
  secret-key: Pxd2Dkp9XC1MQ5lRxc3cKuVm8AyKnoOapcSIGZea
```
4. 将resources/static/目录下的所有js中的ip改为你的ip：
   *ctrl + F 搜索192.168.1.101 替换为 你的ip*
