#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, specularStrength, diffuseStrength, shininess;

in vec3 Normal;//法向量
in vec3 FragPos;//相机观察的片元位置
in vec2 TexCoord;//纹理坐标
in vec4 FragPosLightSpace;//光源观察的片元位置

uniform vec3 viewPos;//相机位置
uniform vec4 u_lightPosition; //光源位置	
uniform vec3 lightColor;//入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler;//盒子纹理采样器

// 雾化效果参数
uniform float fogDensity;    // 雾密度
uniform float fogGradient;   // 雾梯度
uniform vec3 fogColor;       // 雾颜色
uniform int fogType;         // 雾类型：0=线性，1=指数，2=指数平方

float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    float shadow = 0.0;  //非阴影
    
    /*TODO3: 添加阴影计算，返回1表示是阴影，返回0表示是阴影*/
    // 执行透视除法，将裁剪空间坐标转换为标准化设备坐标[-1,1]
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // 转换为[0,1]范围用于深度比较
    projCoords = projCoords * 0.5 + 0.5;
    
    // 检查当前片段是否在阴影贴图的视野范围内
    if(projCoords.z > 1.0)
        return 0.0;
        
    // 从阴影贴图中获取最近的深度值
    float closestDepth = texture(depthTexture, projCoords.xy).r;
    // 获取当前片段的深度
    float currentDepth = projCoords.z;
    
    // 添加阴影偏移量防止阴影失真
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    // 检查当前片段是否在阴影中
    shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
    
    return shadow;
}

// 计算雾化因子
float calculateFogFactor(float distance)
{
    float fogFactor = 0.0;
    
    if (fogType == 0) {
        // 线性雾
        fogFactor = (fogGradient - distance) / (fogGradient - fogDensity);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
    } else if (fogType == 1) {
        // 指数雾
        fogFactor = exp(-fogDensity * distance);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
    } else {
        // 指数平方雾
        fogFactor = exp(-pow(fogDensity * distance, 2.0));
        fogFactor = clamp(fogFactor, 0.0, 1.0);
    }
    
    return fogFactor;
}

void main()
{
    //采样纹理颜色
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    //计算光照颜色
    vec3 norm = normalize(Normal);
    vec3 lightDir;
    if(u_lightPosition.w == 1.0) 
        lightDir = normalize(u_lightPosition.xyz - FragPos);
    else 
        lightDir = normalize(u_lightPosition.xyz);
    
    vec3 viewDir = normalize(viewPos - FragPos);
    vec3 halfDir = normalize(viewDir + lightDir);

    /*TODO2:根据phong shading方法计算ambient,diffuse,specular*/
    // 环境光分量
    vec3 ambient = ambientStrength * lightColor;
    
    // 漫反射分量
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor;
    
    // 镜面反射分量（使用半程向量，这是Blinn-Phong模型，效果更好）
    float spec = pow(max(dot(norm, halfDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
    
    vec3 lightReflectColor = (ambient + diffuse + specular);

    //判定是否阴影，并对各种颜色进行混合
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
    
    // 修改混合方式：环境光不受阴影影响，漫反射和镜面反射受阴影影响
    vec3 resultColor = (ambient + (1.0 - shadow) * (diffuse + specular)) * TextureColor;
    
    // 计算雾化效果
    float distance = length(FragPos - viewPos); // 片段到相机的距离
    float fogFactor = calculateFogFactor(distance);
    
    // 混合物体颜色和雾颜色
    resultColor = mix(fogColor, resultColor, fogFactor);
    
    FragColor = vec4(resultColor, 1.0);
}