# Claude Skills for nondominium Holochain Project

## Overview

This directory contains two specialized Claude Skills designed to accelerate and standardize Holochain development for the nondominium ValueFlows-compliant resource sharing application.

## Available Skills

### 1. Holochain Development Skill 🛠️
**Purpose**: Interactive guidance for Holochain hApp development with integrity-first architecture
**Location**: `./holochain-dev/`
**Best For**: Architecture planning, zome development, pattern implementation, debugging

### 2. Holochain Testing Skill 🧪
**Purpose**: Interactive guidance for testing with exact command selection and 4-layer testing strategy
**Location**: `./holochain-testing/`
**Best For**: Test command precision, multi-agent scenarios, PPR system testing, coverage analysis

## Quick Start

### Using Skills with Claude Code

These skills are designed to work seamlessly with Claude's Skills system:

1. **Auto-discovery**: Claude automatically detects relevant skills based on your context
2. **Progressive loading**: Only loads what's needed for your current task
3. **Interactive guidance**: Step-by-step assistance for complex workflows
4. **Project-tailored**: Specifically configured for nondominium patterns

### Integration with Your nondominium Project

The skills are already installed in your project at `.claude/skills/` and ready to use.

### Skill Activation

Claude automatically loads skills based on your requests:

- **"Help me develop a new zome"** → Loads Holochain Development Skill
- **"Which test command should I run?"** → Loads Holochain Testing Skill
- **"Debug this integrity zome issue"** → Loads Holochain Development Skill
- **"Create test for person zome"** → Loads Holochain Testing Skill

## Skill Contents

### Holochain Development Skill
```
holochain-dev/
├── SKILL.md                       # Interactive development guidance
├── templates/                     # Code templates for rapid development
│   ├── integrity_zome_template.rs      # Integrity zome structure
│   ├── coordinator_zome_template.rs    # Coordinator zome structure
│   ├── validation_patterns.rs          # Common validation patterns
│   └── cross_zome_patterns.rs          # Cross-zome communication patterns
└── README.md                      # Skill-specific documentation
```

### Holochain Testing Skill
```
holochain-testing/
├── SKILL.md                       # Interactive testing guidance
├── templates/                     # Test templates and patterns
│   ├── foundation_test_template.ts      # Foundation test structure
│   ├── integration_test_template.ts     # Cross-zome test patterns
│   ├── scenario_test_template.ts        # Multi-agent workflow tests
│   └── test_commands_reference.md        # Exact test command reference
└── README.md                      # Skill-specific documentation
```

## Usage Examples

### Example 1: Developing a New Zome
**User Request**: "I want to add a ResourceProposal zome for our valueflows system"

**Claude's Response** (using Holochain Development Skill):
1. **Integrity-First Planning**: Designs entry types and validation rules
2. **Architecture Guidance**: Explains integrity → coordinator relationship
3. **Code Generation**: Provides templates for both zomes
4. **Cross-Zome Integration**: Shows how to connect with existing person/resource zomes

### Example 2: Testing Complex Scenarios
**User Request**: "What test command should I run for PPR system testing?"

**Claude's Response** (using Holochain Testing Skill):
1. **Command Selection**: Provides exact `bun run tests` commands
2. **Test Coverage**: Explains which test files cover PPR functionality
3. **Multi-Agent Setup**: Shows how to design 3-agent test scenarios
4. **Debug Support**: Helps analyze test failures and suggest solutions

### Example 3: Architecture Validation
**User Request**: "Help me debug this cross-zome communication issue"

**Claude's Response** (using Holochain Development Skill):
1. **Pattern Analysis**: Reviews cross-zome communication patterns
2. **Error Diagnosis**: Identifies common issues in coordinator-to-coordinator calls
3. **Solution Templates**: Provides working code examples
4. **Testing Guidance**: Suggests specific tests to validate fixes

### Example 4: Test Strategy Planning
**User Request**: "I need comprehensive tests for our governance zome"

**Claude's Response** (using Holochain Testing Skill):
1. **4-Layer Strategy**: Plans foundation → integration → scenario → performance tests
2. **Test Generation**: Creates test templates for each layer
3. **Command Precision**: Provides exact commands for each test type
4. **Coverage Analysis**: Ensures all governance functions are tested

## Project-Specific Integration

### nondominium Project Patterns

These skills are specifically tailored for your project:

**ValueFlows Compliance**:
- EconomicResource, EconomicEvent, Commitment patterns
- Resource lifecycle management
- Economic event tracking and validation

**PPR System (Private data, Purpose, Rights)**:
- Private data sharing workflows
- Capability-based access control
- Cryptographic validation patterns

**3-Zome Architecture**:
- Person zome: Identity, roles, private data
- Resource zome: Resource lifecycle, governance rules
- Governance zome: Commitments, claims, economic events

**Development Environment**:
- Nix shell requirements
- Bun package manager integration
- Tryorama testing framework

## Integration with Development Workflow

### Daily Development

```bash
# Start development with skills guidance
bun start  # Skills will be automatically available

# When adding new features:
# 1. Ask Claude: "Help me implement new functionality"
# 2. Skills guide through integrity-first development
# 3. Generate code using provided templates
# 4. Test using exact commands from testing skill
```

### Testing Workflow

```bash
# Use skills for precise test commands
bun run tests tests/src/nondominium/person/person-foundation-tests.test.ts

# Skills provide:
# - Exact command for specific test files
# - Test generation for new functions
# - Multi-agent scenario design
# - Debug support for test failures
```

### Code Review

```bash
# Skills assist with:
# - Architecture validation (integrity-first patterns)
# - Code quality assessment
# - Test coverage analysis
# - Best practices verification
```

## Best Practices

### For Maximum Benefit

1. **Be Specific**: Ask for exactly what you need (e.g., "Create integrity entry for ResourceRequest")
2. **Use Both Skills**: Development for architecture, Testing for validation
3. **Follow Templates**: Start with provided templates for consistency
4. **Iterative Development**: Use skills incrementally for complex features
5. **Test Thoroughly**: Use testing skill for comprehensive coverage

### When to Use Which Skill

| Situation | Primary Skill | Secondary Skill |
|-----------|---------------|-----------------|
| New zome development | Holochain Development | Holochain Testing |
| Architecture planning | Holochain Development | - |
| Test command selection | Holochain Testing | Holochain Development |
| Debugging zome issues | Holochain Development | Holochain Testing |
| Cross-zome integration | Holochain Development | Holochain Testing |
| Multi-agent scenarios | Holochain Testing | Holochain Development |
| PPR system development | Both | Both |
| ValueFlows integration | Holochain Development | Holochain Testing |

## Customization for Your Project

### Adapting Skills

These skills are already tailored for nondominium but can be further customized:

1. **Add Your Patterns**: Include your own recurring patterns in templates
2. **Extend Validation**: Add project-specific validation rules
3. **Update Examples**: Add your own success stories and solutions
4. **Custom Scripts**: Add automation for your specific workflows

### Project-Specific Extensions

```bash
# Add custom templates
mkdir .claude/skills/holochain-dev/templates/custom

# Add your own patterns
echo "Your custom patterns" > .claude/skills/holochain-dev/templates/custom/your_patterns.rs

# Extend testing templates
echo "Your test patterns" > .claude/skills/holochain-testing/templates/custom/your_tests.ts
```

## Performance and Efficiency

### Progressive Loading

Skills use progressive disclosure to optimize performance:

- **Level 1**: Basic metadata (~100 tokens)
- **Level 2**: Core instructions (~2K tokens)
- **Level 3**: Templates and examples (~3K tokens)

This ensures fast response times while providing comprehensive guidance when needed.

### Efficient Usage

1. **Context-Aware Loading**: Skills load based on your current task
2. **Template Reuse**: Common patterns are cached and reused
3. **Interactive Guidance**: Step-by-step assistance prevents errors
4. **Project Memory**: Skills remember your project structure and patterns

## Troubleshooting

### Common Issues

1. **Skill Not Responding**: Be more specific in your request
2. **Template Variables**: Some templates may need manual customization
3. **Test Commands**: Verify paths match your project structure
4. **Architecture Issues**: Use integrity-first patterns from development skill

### Getting Help

1. **Ask Specific Questions**: "How do I create PPR validation?"
2. **Request Examples**: "Show me a complete cross-zome example"
3. **Debug Assistance**: "This integration test is failing, help me debug"
4. **Planning Help**: "Plan the development of a new resource type"

## Future Enhancements

### Planned Additions

1. **ValueFlows Templates**: More comprehensive ValueFlows pattern library
2. **PPR Testing**: Advanced PPR system testing patterns
3. **Performance Testing**: Load testing templates for multi-agent scenarios
4. **Migration Patterns**: Templates for upgrading existing code
5. **Security Patterns**: Enhanced security and cryptography templates

### Community Contribution

Feel free to:
- Share your custom templates and patterns
- Suggest improvements to existing skills
- Add examples from your own development
- Contribute debugging solutions

## Support

For support with these skills:

1. **Ask Claude Directly**: Skills are designed to be used interactively
2. **Review Templates**: Study provided templates for patterns
3. **Check Documentation**: Each skill has comprehensive guidance
4. **Experiment**: Try different approaches and ask for guidance

---

**Happy Holochain development with Claude Skills! 🚀**

These skills are specifically designed for the nondominium project and will evolve with your development needs. They combine the power of Claude's interactive assistance with deep Holochain expertise to accelerate your ValueFlows-compliant resource sharing application.