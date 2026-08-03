import mongoose from 'mongoose';

const customFieldDefinitionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Text', 'Number', 'Date', 'Dropdown', 'Boolean'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  showInList: {
    type: Boolean,
    default: true
  },
  options: {
    type: [String], // Used for Dropdown field types
    default: []
  }
}, {
  timestamps: true
});

const CustomFieldDefinition = mongoose.model('CustomFieldDefinition', customFieldDefinitionSchema);
export default CustomFieldDefinition;
