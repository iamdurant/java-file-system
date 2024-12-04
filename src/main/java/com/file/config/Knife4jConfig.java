package com.file.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2WebMvc;

@Configuration
@EnableSwagger2WebMvc
public class Knife4jConfig {
    @Bean
    public Docket Api() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(new ApiInfoBuilder()
                        .title("文件系统")
                        .description("# 文件系统")
                        .termsOfServiceUrl("...")
                        .contact(new Contact("jasper", "http://localhost", "iamkevinkd@gmail.com"))
                        .license("...")
                        .licenseUrl("...")
                        .version("1.0")
                        .build())
                .groupName("beta_1.0")
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.file"))
                .paths(PathSelectors.any())
                .build();
    }
}
