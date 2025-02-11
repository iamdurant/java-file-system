window.FileUploader = class FileUploader {
    constructor(file, bucketName, prefix) {
        this.file = file;
        this.bucketName = bucketName;
        this.prefix = prefix;
        this.chunkSize = 2 * 1024 * 1024; // 2MB
        this.retryLimit = 3;
        this.progress = 0;
        this.status = 'waiting'; // waiting, uploading, success, error
        this.errorMessage = '';
        this.aborted = false;
    }

    // 计算总分片数
    calculateTotalChunks() {
        return Math.ceil(this.file.size / this.chunkSize);
    }

    // 创建分片
    createChunk(index) {
        const start = index * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        return this.file.slice(start, end);
    }

    // 检查文件状态
    async checkStatus() {
        try {
            const response = await fetch(`http://127.0.0.1:7654/file/checkChunkStatus?` + 
                `bucketName=${encodeURIComponent(this.bucketName)}` +
                `&prefix=${encodeURIComponent(this.prefix || '')}` +
                `&fileName=${encodeURIComponent(this.file.name)}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || '检查文件状态失败');
            }

            return result.data.chunkIndex;
        } catch (error) {
            console.error('检查文件状态失败:', error);
            throw error;
        }
    }

    // 上传单个分片
    async uploadChunk(chunk, index, total) {
        let retries = 0;
        
        while (retries < this.retryLimit) {
            try {
                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('bucketName', this.bucketName);
                formData.append('prefix', this.prefix || '');
                formData.append('fileName', this.file.name);
                formData.append('cur', index);
                formData.append('total', total);

                const response = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            try {
                                const result = JSON.parse(xhr.responseText);
                                resolve(result);
                            } catch (error) {
                                reject(new Error('解析响应失败'));
                            }
                        } else {
                            reject(new Error(`HTTP错误: ${xhr.status}`));
                        }
                    };
                    
                    xhr.onerror = () => reject(new Error('网络错误'));
                    
                    xhr.open('POST', 'http://127.0.0.1:7654/file/chunksUpload');
                    xhr.send(formData);
                });

                const result = response;
                
                if (!result.success) {
                    throw new Error(result.message || '上传分片失败');
                }

                // 分片上传成功后更新进度
                const progress = Math.round(((index + 1) / total) * 100);
                this.progress = progress;
                this.onProgress?.(progress);

                return true;
            } catch (error) {
                retries++;
                if (retries === this.retryLimit) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // 开始上传
    async start() {
        try {
            const startChunkIndex = await this.checkStatus();
            
            if (startChunkIndex === -1) {
                this.status = 'error';
                this.errorMessage = '当前目录下存在同名文件';
                this.onStatusChange?.(this.status, this.errorMessage);
                return;
            }

            this.status = 'uploading';
            this.onStatusChange?.(this.status);

            const totalChunks = this.calculateTotalChunks();

            // 从startChunkIndex开始上传
            for (let i = startChunkIndex; i < totalChunks; i++) {
                if (this.aborted) {
                    throw new Error('上传已取消');
                }

                const chunk = this.createChunk(i);
                await this.uploadChunk(chunk, i, totalChunks);
            }

            this.status = 'success';
            this.onStatusChange?.(this.status);
        } catch (error) {
            this.status = 'error';
            this.errorMessage = error.message;
            this.onStatusChange?.(this.status, this.errorMessage);
            throw error;
        }
    }

    // 取消上传
    abort() {
        this.aborted = true;
    }
} 