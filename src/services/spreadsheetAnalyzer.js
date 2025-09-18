const ExcelJS = require('exceljs');

class SpreadsheetAnalyzer {
    /**
     * Analyze Excel/CSV files and extract structure
     */
    async analyzeSpreadsheet(fileData) {
        try {
            const workbook = new ExcelJS.Workbook();
            
            if (fileData.buffer) {
                await workbook.xlsx.load(fileData.buffer);
            } else if (typeof fileData === 'string') {
                // Handle CSV data
                return this.analyzeCSV(fileData);
            } else {
                throw new Error('Invalid file data format');
            }

            const analysis = {
                worksheets: [],
                formFields: [],
                dataTypes: [],
                structure: {},
                summary: {}
            };

            workbook.eachSheet((worksheet, sheetId) => {
                const sheetAnalysis = this.analyzeWorksheet(worksheet);
                analysis.worksheets.push(sheetAnalysis);
                
                // Merge form fields from all sheets
                analysis.formFields = analysis.formFields.concat(sheetAnalysis.formFields);
                
                // Collect unique data types
                sheetAnalysis.dataTypes.forEach(type => {
                    if (!analysis.dataTypes.includes(type)) {
                        analysis.dataTypes.push(type);
                    }
                });
            });

            analysis.summary = this.generateSummary(analysis);
            return analysis;
        } catch (error) {
            console.error('❌ Spreadsheet analysis failed:', error);
            throw new Error(`Failed to analyze spreadsheet: ${error.message}`);
        }
    }

    /**
     * Analyze individual worksheet
     */
    analyzeWorksheet(worksheet) {
        const analysis = {
            name: worksheet.name,
            rowCount: worksheet.rowCount,
            columnCount: worksheet.columnCount,
            headers: [],
            formFields: [],
            dataTypes: [],
            patterns: {},
            hasFormula: false,
            structure: 'unknown'
        };

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value) {
                analysis.headers.push({
                    column: colNumber,
                    name: cell.value.toString().trim(),
                    address: cell.address
                });
            }
        });

        // Analyze data structure and types
        if (analysis.headers.length > 0) {
            analysis.structure = this.detectStructure(worksheet, analysis.headers);
            analysis.formFields = this.generateFormFields(worksheet, analysis.headers);
            analysis.dataTypes = this.detectDataTypes(worksheet, analysis.headers);
            analysis.patterns = this.detectPatterns(worksheet, analysis.headers);
        }

        // Check for formulas
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                if (cell.formula) {
                    analysis.hasFormula = true;
                }
            });
        });

        return analysis;
    }

    /**
     * Detect worksheet structure (form, table, report, etc.)
     */
    detectStructure(worksheet, headers) {
        // Check if it looks like a form template
        if (this.looksLikeForm(worksheet)) {
            return 'form_template';
        }

        // Check if it's a data table
        if (headers.length > 1 && worksheet.rowCount > 1) {
            return 'data_table';
        }

        // Check if it's a report format
        if (this.looksLikeReport(worksheet)) {
            return 'report';
        }

        return 'unknown';
    }

    /**
     * Check if worksheet looks like a form
     */
    looksLikeForm(worksheet) {
        let formIndicators = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                const value = cell.value?.toString().toLowerCase() || '';
                
                // Look for form-like patterns
                if (value.includes(':') || value.includes('_____') || 
                    value.includes('name') || value.includes('address') ||
                    value.includes('phone') || value.includes('email') ||
                    value.includes('date') || value.includes('signature')) {
                    formIndicators++;
                }
            });
        });

        return formIndicators >= 3;
    }

    /**
     * Check if worksheet looks like a report
     */
    looksLikeReport(worksheet) {
        const firstRow = worksheet.getRow(1);
        let titleCell = firstRow.getCell(1);
        
        return titleCell.value?.toString().toLowerCase().includes('report') ||
               titleCell.value?.toString().toLowerCase().includes('summary');
    }

    /**
     * Generate form fields from spreadsheet structure
     */
    generateFormFields(worksheet, headers) {
        const fields = [];

        headers.forEach(header => {
            const field = {
                name: this.sanitizeFieldName(header.name),
                label: header.name,
                type: this.inferFieldType(worksheet, header.column),
                required: this.inferRequired(worksheet, header.column),
                validation: this.inferValidation(worksheet, header.column),
                options: this.extractOptions(worksheet, header.column)
            };
            fields.push(field);
        });

        return fields;
    }

    /**
     * Infer field type from data
     */
    inferFieldType(worksheet, columnNumber) {
        const sampleValues = [];
        let rowCount = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && rowCount < 10) { // Skip header, sample first 10 rows
                const cell = row.getCell(columnNumber);
                if (cell.value !== null && cell.value !== undefined) {
                    sampleValues.push(cell.value);
                    rowCount++;
                }
            }
        });

        return this.analyzeValueTypes(sampleValues);
    }

    /**
     * Analyze value types to determine field type
     */
    analyzeValueTypes(values) {
        if (values.length === 0) return 'text';

        const types = values.map(value => {
            if (typeof value === 'number') return 'number';
            if (value instanceof Date) return 'date';
            if (typeof value === 'boolean') return 'boolean';
            
            const str = value.toString();
            
            // Email pattern
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'email';
            
            // Phone pattern
            if (/^\+?[\d\s\-\(\)]{7,15}$/.test(str)) return 'phone';
            
            // URL pattern
            if (/^https?:\/\//.test(str)) return 'url';
            
            // Date pattern
            if (!isNaN(Date.parse(str))) return 'date';
            
            // Number pattern
            if (!isNaN(parseFloat(str))) return 'number';
            
            return 'text';
        });

        // Return most common type
        const typeCounts = {};
        types.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return Object.keys(typeCounts).reduce((a, b) => 
            typeCounts[a] > typeCounts[b] ? a : b
        );
    }

    /**
     * Infer if field is required
     */
    inferRequired(worksheet, columnNumber) {
        let emptyCount = 0;
        let totalCount = 0;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header
                const cell = row.getCell(columnNumber);
                totalCount++;
                if (!cell.value) {
                    emptyCount++;
                }
            }
        });

        // If less than 20% empty, consider required
        return totalCount > 0 && (emptyCount / totalCount) < 0.2;
    }

    /**
     * Infer validation rules
     */
    inferValidation(worksheet, columnNumber) {
        const validation = {};
        const values = [];
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const cell = row.getCell(columnNumber);
                if (cell.value) {
                    values.push(cell.value);
                }
            }
        });

        if (values.length === 0) return null;

        const type = this.analyzeValueTypes(values);

        switch (type) {
            case 'email':
                validation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
                validation.message = 'Please enter a valid email address';
                break;
            case 'phone':
                validation.pattern = '^\\+?[\\d\\s\\-\\(\\)]{7,15}$';
                validation.message = 'Please enter a valid phone number';
                break;
            case 'number':
                const numbers = values.filter(v => !isNaN(v)).map(v => parseFloat(v));
                if (numbers.length > 0) {
                    validation.min = Math.min(...numbers);
                    validation.max = Math.max(...numbers);
                }
                break;
            case 'text':
                const lengths = values.map(v => v.toString().length);
                if (lengths.length > 0) {
                    validation.minLength = Math.min(...lengths);
                    validation.maxLength = Math.max(...lengths);
                }
                break;
        }

        return Object.keys(validation).length > 0 ? validation : null;
    }

    /**
     * Extract options for select fields
     */
    extractOptions(worksheet, columnNumber) {
        const uniqueValues = new Set();
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const cell = row.getCell(columnNumber);
                if (cell.value) {
                    uniqueValues.add(cell.value.toString());
                }
            }
        });

        // If there are few unique values, treat as options
        if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
            return Array.from(uniqueValues);
        }

        return null;
    }

    /**
     * Detect data types in worksheet
     */
    detectDataTypes(worksheet, headers) {
        const types = new Set();

        headers.forEach(header => {
            const type = this.inferFieldType(worksheet, header.column);
            types.add(type);
        });

        return Array.from(types);
    }

    /**
     * Detect patterns in data
     */
    detectPatterns(worksheet, headers) {
        const patterns = {};

        // Check for calculated fields
        patterns.hasCalculations = false;
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                if (cell.formula) {
                    patterns.hasCalculations = true;
                }
            });
        });

        // Check for data validation
        patterns.hasValidation = false;
        headers.forEach(header => {
            const validation = this.inferValidation(worksheet, header.column);
            if (validation) {
                patterns.hasValidation = true;
            }
        });

        return patterns;
    }

    /**
     * Analyze CSV data
     */
    analyzeCSV(csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            throw new Error('Empty CSV data');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));

        const analysis = {
            worksheets: [{
                name: 'CSV Data',
                rowCount: rows.length + 1,
                columnCount: headers.length,
                headers: headers.map((name, index) => ({ column: index + 1, name, address: `${String.fromCharCode(65 + index)}1` })),
                formFields: [],
                dataTypes: [],
                patterns: {},
                hasFormula: false,
                structure: 'data_table'
            }],
            formFields: [],
            dataTypes: [],
            structure: {},
            summary: {}
        };

        // Generate form fields for CSV
        analysis.worksheets[0].formFields = headers.map((header, index) => {
            const columnData = rows.map(row => row[index]).filter(val => val);
            return {
                name: this.sanitizeFieldName(header),
                label: header,
                type: this.analyzeValueTypes(columnData),
                required: columnData.length > rows.length * 0.8,
                validation: null,
                options: this.getUniqueValues(columnData)
            };
        });

        analysis.formFields = analysis.worksheets[0].formFields;
        analysis.dataTypes = [...new Set(analysis.formFields.map(field => field.type))];
        analysis.summary = this.generateSummary(analysis);

        return analysis;
    }

    /**
     * Get unique values for potential select options
     */
    getUniqueValues(values) {
        const unique = [...new Set(values)];
        return unique.length <= 10 && unique.length > 1 ? unique : null;
    }

    /**
     * Generate analysis summary
     */
    generateSummary(analysis) {
        return {
            totalWorksheets: analysis.worksheets.length,
            totalFields: analysis.formFields.length,
            dataTypes: analysis.dataTypes,
            hasValidation: analysis.formFields.some(field => field.validation),
            hasOptions: analysis.formFields.some(field => field.options),
            complexity: this.calculateComplexity(analysis),
            recommendedApps: this.getRecommendations(analysis)
        };
    }

    /**
     * Calculate complexity score
     */
    calculateComplexity(analysis) {
        let score = 0;
        
        score += analysis.formFields.length; // Number of fields
        score += analysis.worksheets.length * 2; // Multiple sheets
        score += analysis.formFields.filter(f => f.validation).length * 2; // Validation rules
        score += analysis.formFields.filter(f => f.options).length; // Select fields
        
        if (score <= 10) return 'low';
        if (score <= 25) return 'medium';
        return 'high';
    }

    /**
     * Get app recommendations
     */
    getRecommendations(analysis) {
        const recommendations = [];

        if (analysis.formFields.length > 0) {
            recommendations.push('data-entry-form');
        }

        if (analysis.worksheets.some(ws => ws.structure === 'form_template')) {
            recommendations.push('digital-form');
        }

        if (analysis.dataTypes.includes('number')) {
            recommendations.push('analytics-dashboard');
        }

        return recommendations;
    }

    /**
     * Utility function to sanitize field names
     */
    sanitizeFieldName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}

module.exports = {
    analyzeSpreadsheet: async (fileData) => {
        const analyzer = new SpreadsheetAnalyzer();
        return await analyzer.analyzeSpreadsheet(fileData);
    }
};