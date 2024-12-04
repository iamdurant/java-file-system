# java-file-system
java文件管理系统，存储使用minio，用到redis

- **后端**：java-spring-boot
- **存储**：minio
- **中间应用**：redis

### 功能
- 文件的上传，下载
- 支持文件夹，文件夹的创建与删除
- 支持预览视频
- 支持markdown预览
- 微型音频播放器

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

### 本人用途
1. java课程设计作业
2. 凑合能用，跑在废弃的小米8-linux-deploy上，存储各种废料

### 演示视频
[演示视频](https://github.com/user-attachments/assets/297a11fe-beb6-4927-b00b-1525d4754d43)
