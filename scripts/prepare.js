// Copies the offline speech-recognition model (for Auto Captions) into app/ from the npm packages.
// The editor joins "partN" files back together, so each file is copied whole into part0 and the
// other parts are left empty.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), nm = path.join(root, 'node_modules');
const model = path.join(nm, 'sts-whisper-tiny', 'models', 'Xenova', 'whisper-tiny'), tf = path.join(nm, '@huggingface', 'transformers', 'dist');
const asr = path.join(root, 'app', 'asr'), vendor = path.join(root, 'app', 'vendor');
if (!fs.existsSync(model) || !fs.existsSync(tf)) { console.error('Run "npm install" first.'); process.exit(1); }
fs.mkdirSync(asr, { recursive: true }); fs.mkdirSync(vendor, { recursive: true });
for (const f of ['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json', 'added_tokens.json', 'special_tokens_map.json', 'normalizer.json']) fs.copyFileSync(path.join(model, f), path.join(asr, f));
const split = (src, name, parts) => { fs.copyFileSync(src, path.join(asr, name + '.part0.wasm')); for (let i = 1; i < parts; i++) fs.writeFileSync(path.join(asr, name + '.part' + i + '.wasm'), Buffer.alloc(0)); };
split(path.join(model, 'onnx', 'encoder_model_quantized.onnx'), 'encoder', 1);
split(path.join(model, 'onnx', 'decoder_model_merged_quantized.onnx'), 'decoder', 3);
split(path.join(tf, 'ort-wasm-simd-threaded.jsep.wasm'), 'ortwasm', 2);
for (const f of ['transformers.min.js', 'ort-wasm-simd-threaded.jsep.mjs']) fs.copyFileSync(path.join(tf, f), path.join(vendor, f));
console.log('Offline caption model ready.');
