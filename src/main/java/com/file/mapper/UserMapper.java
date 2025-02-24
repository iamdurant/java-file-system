package com.file.mapper;

import com.file.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * <p>
 * 用户表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {

}
