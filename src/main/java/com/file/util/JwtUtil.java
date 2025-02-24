package com.file.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;

import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

public class JwtUtil {
    @Value("${jwt.secret}")
    private static String jwtSecret = "asdhugjasdNDUYGasdh-aSDHGd47bd1D";

    /***
     *
     * @param claims 自定义body信息
     * @return token
     */
    public static String token(Map<String, Object> claims) {
        HashMap<String, Object> header = new HashMap<>();
        header.put("alg", "HMAC");
        header.put("typ", "JWT");

        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DATE, 7);
        JWTCreator.Builder builder = JWT.create().withHeader(header)
                .withExpiresAt(calendar.getTime());

        for (Map.Entry<String, Object> entry : claims.entrySet()) {
            builder.withClaim(entry.getKey(), entry.getValue().toString());
        }

        return builder.sign(Algorithm.HMAC256(jwtSecret));
    }

    /**
     *
     * @param token token
     * @return 自定义body
     */
    public static Map<String, Claim> decrypt(String token) {
        JWTVerifier verifier = JWT.require(Algorithm.HMAC256(jwtSecret)).build();
        DecodedJWT verify = verifier.verify(token);
        return verify.getClaims();
    }
}
