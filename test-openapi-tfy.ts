// Test script to validate and generate tools from openapi-tfy.json
import { OpenAPIToolGenerator, Validator } from 'mcp-from-openapi';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testOpenApiTfy() {
  try {
    console.log('Loading openapi-tfy.json...');
    const specPath = path.join(process.cwd(), 'openapi-tfy.json');
    const specContent = await fs.readFile(specPath, 'utf-8');
    const spec = JSON.parse(specContent);
    
    console.log('Creating generator with validate: true...');
    const generator = await OpenAPIToolGenerator.fromJSON(spec, { 
      validate: true,
      dereference: true
    });
    
    console.log('Running validation...');
    const result = await generator.validate();
    console.log('Validation result:', JSON.stringify(result.errors, null, 2));
    const errorCount = result.errors?.length || 0;
    console.log(`Validation errors count: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('✅ Validation passed!');
    } else {
      console.log('❌ Validation failed with errors');
      console.log('\nTrying with validate: false to see if tools can still be generated...');
      
      const generatorNoValidate = await OpenAPIToolGenerator.fromJSON(spec, { 
        validate: false,
        dereference: true
      });
      
      console.log('Generating tools with validate: false...');
      const toolsNoValidate = await generatorNoValidate.generateTools();
      console.log(`Generated ${toolsNoValidate.length} tools`);
      
      // Log first few tools as sample
      if (toolsNoValidate.length > 0) {
        console.log('\nSample tools (first 5):');
        toolsNoValidate.slice(0, 5).forEach((tool, idx) => {
          console.log(`\nTool ${idx + 1}:`);
          console.log(`  Name: ${tool.name}`);
          console.log(`  Description: ${tool.description?.substring(0, 100)}...`);
          console.log(`  Path: ${tool.metadata?.path}`);
          console.log(`  Method: ${tool.metadata?.method}`);
        });
      }

      // Check if the document is actually dereferenced
      const document = generatorNoValidate.getDocument();
      const validator = new Validator();
      const result = await validator.validate(document);
      console.log('\nValidation result:', JSON.stringify(result));
      return;
    }
    
    console.log('\nGenerating tools...');
    const tools = await generator.generateTools();
    console.log(`Generated ${tools.length} tools`);
    
    // Log first few tools as sample
    if (tools.length > 0) {
      console.log('\nSample tools (first 3):');
      tools.slice(0, 3).forEach((tool, idx) => {
        console.log(`\nTool ${idx + 1}:`);
        console.log(`  Name: ${tool.name}`);
        console.log(`  Description: ${tool.description?.substring(0, 100)}...`);
        console.log(`  Path: ${tool.metadata?.path}`);
        console.log(`  Method: ${tool.metadata?.method}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testOpenApiTfy();

