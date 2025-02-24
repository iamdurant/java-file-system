package com.file.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;

public class JwtTest {
    public static void main(String[] args) {
        verifyJwt("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoid3diIiwicHJpIjoiY29tbW9uIiwiZXhwIjoxNzM1ODQwMDc4fQ.XENlmA7bc6V983mKUMTH8tXt0suEmsVmDUNs1BgqYYQ");
    }

    static void verifyJwt(String jwt) {
        JWTVerifier verifier = JWT.require(Algorithm.HMAC256("asdkhaskdhakjshd")).build();
        DecodedJWT result = verifier.verify(jwt);

        System.out.println(result.getClaim("user").asString());
        System.out.println(result.getClaim("pri").asString());
        System.out.println(result.getExpiresAt());
    }

    static void generateJwt() {
        HashMap<String, Object> header = new HashMap<>();
        header.put("alg", "HMAC");
        header.put("typ", "JWT");

        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DATE, 7);

        String jwt = JWT.create().withHeader(header)
                .withClaim("user", "wwb")
                .withClaim("pri", "common")
                .withExpiresAt(calendar.getTime())
                .sign(Algorithm.HMAC256("asdkhaskdhakjshd"));

        System.out.println(jwt);
    }
}
