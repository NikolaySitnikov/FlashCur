#!/usr/bin/env node

// Test Redis connection script
import fetch from 'node-fetch';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log('🔍 Testing Redis connection...');
console.log('Redis URL:', UPSTASH_REDIS_REST_URL);
console.log('Redis Token (first 20 chars):', UPSTASH_REDIS_REST_TOKEN?.substring(0, 20) + '...');

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ Missing Redis credentials');
    process.exit(1);
}

async function testRedis() {
    try {
        // Test with a simple GET request
        console.log('🔄 Testing GET request...');
        const getResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/get/test`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
            }
        });

        console.log('GET response status:', getResponse.status);
        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            console.log('GET response error:', errorText);
        } else {
            console.log('✅ GET request successful');
        }

        // Test with a simple SET request
        console.log('🔄 Testing SET request...');
        const setResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/set/test`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'text/plain'
            },
            body: 'test-value'
        });

        console.log('SET response status:', setResponse.status);
        if (!setResponse.ok) {
            const errorText = await setResponse.text();
            console.log('SET response error:', errorText);
        } else {
            console.log('✅ SET request successful');
        }

        // Test with a GET request to verify the value
        console.log('🔄 Testing GET request to verify value...');
        const getResponse2 = await fetch(`${UPSTASH_REDIS_REST_URL}/get/test`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
            }
        });

        console.log('GET response status:', getResponse2.status);
        if (!getResponse2.ok) {
            const errorText = await getResponse2.text();
            console.log('GET response error:', errorText);
        } else {
            const result = await getResponse2.json();
            console.log('✅ GET request successful, result:', result);
        }

    } catch (error) {
        console.error('❌ Redis test error:', error.message);
    }
}

testRedis();
