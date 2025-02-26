package com.file.mapper;

import com.file.entity.File;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * <p>
 * 文件表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Mapper
public interface FileMapper extends BaseMapper<File> {

}
