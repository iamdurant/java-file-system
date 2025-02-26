package com.file.service.impl;

import com.file.entity.Directory;
import com.file.mapper.DirectoryMapper;
import com.file.service.IDirectoryService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 文件夹表 服务实现类
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Service
public class DirectoryServiceImpl extends ServiceImpl<DirectoryMapper, Directory> implements IDirectoryService {

}
