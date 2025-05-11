const content = require('../content.js');
const { performReplacements } = content;

describe('DOM Manipulation', () => {
  let originalRules;
  let originalRequestAnimationFrame;
  let originalConsole;

  beforeAll(() => {
    // Store original values
    originalRules = content.rules.get();
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalConsole = { ...console };
  });

  beforeEach(() => {
    // Reset the document body before each test
    const contentDiv = document.createElement('div');
    contentDiv.id = 'content';
    
    const p1 = document.createElement('p');
    p1.textContent = 'Hello world';
    console.log('Created p1 with text:', p1.textContent);
    
    const p2 = document.createElement('p');
    p2.textContent = 'HELLO WORLD';
    console.log('Created p2 with text:', p2.textContent);
    
    const p3 = document.createElement('p');
    p3.textContent = 'Hello World';
    console.log('Created p3 with text:', p3.textContent);
    
    const div = document.createElement('div');
    div.textContent = 'Some more text with hello world in it';
    console.log('Created div with text:', div.textContent);
    
    contentDiv.appendChild(p1);
    contentDiv.appendChild(p2);
    contentDiv.appendChild(p3);
    contentDiv.appendChild(div);
    
    document.body.innerHTML = '';
    document.body.appendChild(contentDiv);

    console.log('DOM after setup:', document.body.innerHTML);

    // Reset the rules
    content.rules.set([
      { find: 'hello world', replace: 'goodbye earth' },
      { find: 'Hello World', replace: 'Goodbye Earth' }
    ]);

    console.log('Rules set:', content.rules.get());

    // Mock requestAnimationFrame to execute immediately
    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
    content.rules.set([]);
  });

  afterAll(() => {
    // Restore original values
    content.rules.set(originalRules);
    global.requestAnimationFrame = originalRequestAnimationFrame;
    Object.assign(console, originalConsole);
  });

  function waitForDomUpdate() {
    return new Promise(resolve => {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        // Add a small delay to ensure all microtasks are complete
        setTimeout(() => {
          console.log('DOM after update:', document.body.innerHTML);
          resolve();
        }, 0);
      });
    });
  }

  function getTextContent(element) {
    console.log('Getting text content for element:', element.tagName);
    
    // If the element is a text node, return its value
    if (element.nodeType === Node.TEXT_NODE) {
        const content = element.nodeValue.trim();
        console.log('Text node content:', content);
        return content;
    }
    
    // For element nodes, get all text nodes
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let content = '';
    let currentNode;
    while (currentNode = walker.nextNode()) {
        content += (content ? ' ' : '') + currentNode.nodeValue.trim();
    }
    
    console.log('Element content:', content);
    return content;
  }

  test('should replace text while preserving case', async () => {
    console.log('Starting test: should replace text while preserving case');
    
    // Log the initial state
    const initialContent = document.body.innerHTML;
    console.log('Initial DOM content:', initialContent);
    
    // Log the rules
    console.log('Rules:', content.rules.get());
    
    // Log each text node before replacement
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );
    
    let node;
    console.log('Text nodes before replacement:');
    while (node = walker.nextNode()) {
        console.log('- Node:', node.nodeValue, 'Parent:', node.parentNode.tagName);
    }
    
    performReplacements(document.body);
    await waitForDomUpdate();

    // Log each text node after replacement
    const walker2 = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );
    
    console.log('Text nodes after replacement:');
    while (node = walker2.nextNode()) {
        console.log('- Node:', node.nodeValue, 'Parent:', node.parentNode.tagName);
    }

    const paragraphs = document.querySelectorAll('p, div');
    console.log('Found paragraphs:', paragraphs.length);
    
    Array.from(paragraphs).forEach((p, i) => {
        console.log(`Paragraph ${i}:`, p.innerHTML);
        const textNode = p.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            console.log(`Paragraph ${i} text node:`, textNode.nodeValue);
        }
    });

    const p1 = document.querySelector('p:nth-child(1)');
    const p2 = document.querySelector('p:nth-child(2)');
    const p3 = document.querySelector('p:nth-child(3)');
    const div = document.querySelector('div > div');

    console.log('p1:', p1.innerHTML, 'firstChild:', p1.firstChild?.nodeValue);
    console.log('p2:', p2.innerHTML, 'firstChild:', p2.firstChild?.nodeValue);
    console.log('p3:', p3.innerHTML, 'firstChild:', p3.firstChild?.nodeValue);
    console.log('div:', div.innerHTML, 'firstChild:', div.firstChild?.nodeValue);

    expect(getTextContent(p1.firstChild)).toBe('Goodbye earth');
    expect(getTextContent(p2.firstChild)).toBe('GOODBYE EARTH');
    expect(getTextContent(p3.firstChild)).toBe('Goodbye earth');
    expect(getTextContent(div.firstChild)).toBe('Some more text with goodbye earth in it');
  }, 10000);

  test('should not replace text in script tags', async () => {
    const script = document.createElement('script');
    script.textContent = 'const text = "hello world";';
    
    const p = document.createElement('p');
    p.textContent = 'hello world';
    
    document.body.innerHTML = '';
    document.body.appendChild(script);
    document.body.appendChild(p);

    performReplacements(document.body);
    await waitForDomUpdate();

    expect(script.textContent.trim()).toBe('const text = "hello world";');
    expect(getTextContent(p.firstChild)).toBe('goodbye earth');
  }, 10000);

  test('should handle multiple replacements in the same text node', async () => {
    const p = document.createElement('p');
    p.textContent = 'hello world hello world';
    
    document.body.innerHTML = '';
    document.body.appendChild(p);

    performReplacements(document.body);
    await waitForDomUpdate();

    expect(getTextContent(p.firstChild)).toBe('goodbye earth goodbye earth');
  }, 10000);
}); 